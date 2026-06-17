<?php

namespace Tests\Feature;

use App\Members\Models\Member;
use App\Scheduling\Actions\PublishSchedule;
use App\Scheduling\Enums\ScheduleStatus;
use App\Scheduling\Enums\SolveStatus;
use App\Scheduling\Models\MemberSatisfaction;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\SolveRun;
use App\Scheduling\Solver\SolveRequestBuilder;
use App\Teams\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HistoryFairnessTest extends TestCase
{
    use RefreshDatabase;

    public function test_prior_dissatisfaction_is_a_decayed_sum_of_recent_team_periods(): void
    {
        // Defaults: window=3, decay=0.5.
        $team = Team::factory()->create();
        $member = Member::factory()->create();
        $team->members()->attach($member);

        $schedule = Schedule::factory()->create([
            'team_id' => $team->id,
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-21',
        ]);

        // Three recent periods (ranks 0,1,2) -> weights 1, 0.5, 0.25.
        foreach (['2026-05-31', '2026-04-30', '2026-03-31'] as $end) {
            MemberSatisfaction::factory()->create([
                'member_id' => $member->id,
                'team_id' => $team->id,
                'period_end' => $end,
                'dissatisfaction' => 100_000,
            ]);
        }
        // A 4th, older period falls outside the window -> ignored.
        MemberSatisfaction::factory()->create([
            'member_id' => $member->id, 'team_id' => $team->id,
            'period_end' => '2026-02-28', 'dissatisfaction' => 100_000,
        ]);
        // A future period (>= this schedule's start) -> ignored.
        MemberSatisfaction::factory()->create([
            'member_id' => $member->id, 'team_id' => $team->id,
            'period_end' => '2026-07-31', 'dissatisfaction' => 100_000,
        ]);
        // Another team's history -> out of scope.
        MemberSatisfaction::factory()->create([
            'member_id' => $member->id, 'team_id' => Team::factory()->create()->id,
            'period_end' => '2026-05-31', 'dissatisfaction' => 100_000,
        ]);

        $request = app(SolveRequestBuilder::class)->build($schedule);

        $built = collect($request['members'])->firstWhere('id', $member->id);
        $this->assertSame(175_000, $built['priorDissatisfaction']); // 100k*(1 + .5 + .25)
    }

    public function test_publish_snapshots_realised_dissatisfaction_from_latest_run(): void
    {
        $team = Team::factory()->create();
        $member = Member::factory()->create();
        $schedule = Schedule::factory()->create([
            'team_id' => $team->id,
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-21',
        ]);

        $this->solveRun($schedule, SolveStatus::Succeeded, ['memberDissatisfaction' => [$member->id => 7]], '2026-06-14 09:00:00');
        $latest = $this->solveRun($schedule, SolveStatus::Succeeded, ['memberDissatisfaction' => [$member->id => 42]], '2026-06-14 10:00:00');

        app(PublishSchedule::class)->handle($schedule);

        $this->assertSame(ScheduleStatus::Published, $schedule->refresh()->status);

        $record = (new MemberSatisfaction)->newQuery()
            ->where('schedule_id', $schedule->id)
            ->where('member_id', $member->id)
            ->firstOrFail();
        $this->assertSame(42, $record->dissatisfaction); // latest run wins
        $this->assertSame($team->id, $record->team_id);
        $this->assertSame('2026-06-15', $record->period_start->toDateString());

        // Re-publishing is idempotent (updates in place, no duplicate row).
        $latest->diagnostics = ['memberDissatisfaction' => [$member->id => 99]];
        $latest->save();
        app(PublishSchedule::class)->handle($schedule);

        $this->assertSame(1, (new MemberSatisfaction)->newQuery()
            ->where('schedule_id', $schedule->id)->where('member_id', $member->id)->count());
    }

    public function test_publish_without_dissatisfaction_diagnostics_records_nothing(): void
    {
        $schedule = Schedule::factory()->create();
        $this->solveRun($schedule, SolveStatus::Succeeded, ['solver' => 'cp-sat']);

        app(PublishSchedule::class)->handle($schedule);

        $this->assertSame(0, (new MemberSatisfaction)->newQuery()->count());
    }

    /**
     * @param  array<string, mixed>  $diagnostics
     */
    private function solveRun(Schedule $schedule, SolveStatus $status, array $diagnostics, ?string $createdAt = null): SolveRun
    {
        $run = new SolveRun;
        $run->schedule()->associate($schedule);
        $run->status = $status;
        $run->diagnostics = $diagnostics;
        if ($createdAt !== null) {
            $run->created_at = $createdAt;
        }
        $run->save();

        return $run;
    }
}

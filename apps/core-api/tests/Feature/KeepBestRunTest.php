<?php

namespace Tests\Feature;

use App\Members\Models\Member;
use App\Scheduling\Enums\SolveStatus;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use App\Scheduling\Models\ShiftAssignment;
use App\Scheduling\Models\ShiftRequirement;
use App\Scheduling\Models\SolveRun;
use App\Teams\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KeepBestRunTest extends TestCase
{
    use RefreshDatabase;

    public function test_solve_retains_its_result_as_a_snapshot(): void
    {
        $team = Team::factory()->create();
        $member = Member::factory()->create();
        $team->members()->attach($member);

        $schedule = Schedule::factory()->create(['team_id' => $team->id]);
        $this->actingAsOwner($team->organization);
        $shift = ScheduledShift::factory()->create([
            'schedule_id' => $schedule->id,
            'start_at' => '2026-06-15 09:00:00',
            'end_at' => '2026-06-15 17:00:00',
        ]);
        ShiftRequirement::factory()->create(['scheduled_shift_id' => $shift->id, 'count' => 1]);

        $this->postJson("schedules/{$schedule->id}/solve")->assertStatus(202);

        $run = (new SolveRun)->newQuery()->where('schedule_id', $schedule->id)->sole();
        $this->assertSame(
            [['shiftId' => $shift->id, 'memberId' => $member->id]],
            $run->result_snapshot,
        );
    }

    public function test_runs_are_listed_newest_first(): void
    {
        $schedule = Schedule::factory()->create();
        $this->actingAsOwner($schedule->team->organization);
        $older = $this->makeRun($schedule, '2026-06-16 09:00:00');
        $newer = $this->makeRun($schedule, '2026-06-16 10:00:00');

        $this->getJson("schedules/{$schedule->id}/solve-runs")
            ->assertOk()
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.1.id', $older->id);
    }

    public function test_apply_run_restores_its_snapshot_to_the_draft(): void
    {
        $schedule = Schedule::factory()->create();
        $this->actingAsOwner($schedule->team->organization);
        $shift = ScheduledShift::factory()->create(['schedule_id' => $schedule->id]);
        $member = Member::factory()->create();

        $run = $this->makeRun($schedule, '2026-06-16 09:00:00', [
            ['shiftId' => $shift->id, 'memberId' => $member->id],
        ]);

        // Draft starts empty (a later re-solve / manual clear wiped it).
        $this->assertSame(0, (new ShiftAssignment)->newQuery()->count());

        $this->postJson("solve-runs/{$run->id}/apply")->assertOk();

        $this->assertTrue((new ShiftAssignment)->newQuery()
            ->where('scheduled_shift_id', $shift->id)
            ->where('member_id', $member->id)
            ->exists());
    }

    public function test_apply_keeps_locked_assignments(): void
    {
        $schedule = Schedule::factory()->create();
        $this->actingAsOwner($schedule->team->organization);
        $lockedShift = ScheduledShift::factory()->create(['schedule_id' => $schedule->id]);
        $snapshotShift = ScheduledShift::factory()->create(['schedule_id' => $schedule->id]);
        $lockedMember = Member::factory()->create();
        $solvedMember = Member::factory()->create();

        // A manually locked pick the run's snapshot does not include.
        $locked = new ShiftAssignment;
        $locked->scheduled_shift_id = $lockedShift->id;
        $locked->member_id = $lockedMember->id;
        $locked->locked = true;
        $locked->save();

        $run = $this->makeRun($schedule, '2026-06-16 09:00:00', [
            ['shiftId' => $snapshotShift->id, 'memberId' => $solvedMember->id],
        ]);

        $this->postJson("solve-runs/{$run->id}/apply")->assertOk();

        $this->assertDatabaseHas('shift_assignments', [
            'scheduled_shift_id' => $lockedShift->id,
            'member_id' => $lockedMember->id,
            'locked' => true,
        ]);
        $this->assertDatabaseHas('shift_assignments', [
            'scheduled_shift_id' => $snapshotShift->id,
            'member_id' => $solvedMember->id,
        ]);
    }

    public function test_applying_a_run_without_a_snapshot_is_rejected(): void
    {
        $schedule = Schedule::factory()->create();
        $this->actingAsOwner($schedule->team->organization);
        $run = $this->makeRun($schedule, '2026-06-16 09:00:00', null, SolveStatus::Pending);

        $this->postJson("solve-runs/{$run->id}/apply")->assertStatus(422);
    }

    /**
     * @param  list<array{shiftId: string, memberId: string}>|null  $snapshot
     */
    private function makeRun(Schedule $schedule, string $createdAt, ?array $snapshot = null, SolveStatus $status = SolveStatus::Succeeded): SolveRun
    {
        $run = new SolveRun;
        $run->schedule()->associate($schedule);
        $run->status = $status;
        $run->result_snapshot = $snapshot;
        $run->created_at = $createdAt;
        $run->save();

        return $run;
    }
}

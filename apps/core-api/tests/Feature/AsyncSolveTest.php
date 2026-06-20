<?php

namespace Tests\Feature;

use App\Members\Models\Member;
use App\Scheduling\Enums\SolveStatus;
use App\Scheduling\Jobs\SolveScheduleJob;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use App\Scheduling\Models\ShiftAssignment;
use App\Scheduling\Models\ShiftRequirement;
use App\Scheduling\Models\SolveRun;
use App\Scheduling\Solver\Solver;
use App\Teams\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use RuntimeException;
use Tests\TestCase;

class AsyncSolveTest extends TestCase
{
    use RefreshDatabase;

    public function test_solve_queues_a_pending_run_and_returns_202(): void
    {
        Queue::fake();
        $schedule = Schedule::factory()->create();
        $this->actingAsOwner($schedule->team->organization);

        $response = $this->postJson("schedules/{$schedule->id}/solve");

        $response->assertStatus(202)->assertJsonPath('data.status', SolveStatus::Pending->value);

        $run = (new SolveRun)->newQuery()->where('schedule_id', $schedule->id)->sole();
        $this->assertSame(SolveStatus::Pending, $run->status);
        Queue::assertPushed(SolveScheduleJob::class, fn (SolveScheduleJob $job) => $job->run->is($run));
    }

    public function test_queued_job_solves_and_writes_assignments(): void
    {
        // Sync queue (phpunit env) runs the job inline during the request.
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
        $this->assertSame(SolveStatus::Succeeded, $run->status);

        $this->assertTrue((new ShiftAssignment)->newQuery()
            ->where('scheduled_shift_id', $shift->id)
            ->where('member_id', $member->id)
            ->exists());
    }

    public function test_solver_failure_marks_the_run_failed(): void
    {
        $this->app->bind(Solver::class, fn () => new class implements Solver
        {
            public function solve(array $request): array
            {
                throw new RuntimeException('solver exploded');
            }
        });

        $schedule = Schedule::factory()->create();
        $this->actingAsOwner($schedule->team->organization);

        $this->postJson("schedules/{$schedule->id}/solve")->assertStatus(202);

        $run = (new SolveRun)->newQuery()->where('schedule_id', $schedule->id)->sole();
        $this->assertSame(SolveStatus::Failed, $run->status);
        $this->assertSame('solver exploded', $run->diagnostics['error']);
    }
}

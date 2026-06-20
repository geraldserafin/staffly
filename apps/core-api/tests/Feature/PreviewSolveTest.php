<?php

namespace Tests\Feature;

use App\Members\Models\Member;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use App\Scheduling\Models\ShiftAssignment;
use App\Scheduling\Models\ShiftRequirement;
use App\Scheduling\Models\SolveRun;
use App\Teams\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PreviewSolveTest extends TestCase
{
    use RefreshDatabase;

    private function solvableSchedule(): array
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

        return [$schedule, $shift, $member];
    }

    public function test_preview_returns_assignments_without_persisting(): void
    {
        [$schedule, $shift, $member] = $this->solvableSchedule();

        $response = $this->postJson("schedules/{$schedule->id}/solve/preview", ['lambda' => 0.8]);

        $response->assertOk()
            ->assertJsonPath('assignments.0.shiftId', $shift->id)
            ->assertJsonPath('assignments.0.memberId', $member->id)
            ->assertJsonStructure(['assignments', 'diagnostics']);

        // Dry run: nothing written, no run recorded.
        $this->assertSame(0, (new ShiftAssignment)->newQuery()->count());
        $this->assertSame(0, (new SolveRun)->newQuery()->count());
    }

    public function test_preview_works_without_a_lambda(): void
    {
        [$schedule] = $this->solvableSchedule();

        $this->postJson("schedules/{$schedule->id}/solve/preview")
            ->assertOk()
            ->assertJsonStructure(['assignments', 'diagnostics']);
    }

    public function test_preview_rejects_out_of_range_lambda(): void
    {
        $schedule = Schedule::factory()->create();
        $this->actingAsOwner($schedule->team->organization);

        $this->postJson("schedules/{$schedule->id}/solve/preview", ['lambda' => 1.5])
            ->assertStatus(422)
            ->assertJsonValidationErrorFor('lambda');
    }
}

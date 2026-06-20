<?php

namespace Tests\Feature;

use App\Members\Models\Member;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use App\Teams\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManualAssignmentTest extends TestCase
{
    use RefreshDatabase;

    private function shift(Team $team, string $start, string $end): ScheduledShift
    {
        $schedule = Schedule::factory()->create(['team_id' => $team->id]);

        return ScheduledShift::factory()->create([
            'schedule_id' => $schedule->id,
            'start_at' => $start,
            'end_at' => $end,
        ]);
    }

    private function assign(ScheduledShift $shift, Member $member): \Illuminate\Testing\TestResponse
    {
        return $this->postJson("scheduled-shifts/{$shift->id}/assignments", ['memberId' => $member->id]);
    }

    public function test_team_member_can_be_assigned(): void
    {
        $team = Team::factory()->create();
        $member = Member::factory()->create();
        $team->members()->attach($member);
        $this->actingAsOwner($team->organization);
        $shift = $this->shift($team, '2026-06-15 09:00:00', '2026-06-15 17:00:00');

        $this->assign($shift, $member)->assertStatus(201);
    }

    public function test_non_team_member_is_rejected(): void
    {
        $team = Team::factory()->create();
        $member = Member::factory()->create(); // not attached to the team
        $this->actingAsOwner($team->organization);
        $shift = $this->shift($team, '2026-06-15 09:00:00', '2026-06-15 17:00:00');

        $this->assign($shift, $member)
            ->assertStatus(422)
            ->assertJsonValidationErrorFor('memberId');
    }

    public function test_member_cannot_be_assigned_to_the_same_shift_twice(): void
    {
        $team = Team::factory()->create();
        $member = Member::factory()->create();
        $team->members()->attach($member);
        $this->actingAsOwner($team->organization);
        $shift = $this->shift($team, '2026-06-15 09:00:00', '2026-06-15 17:00:00');

        $this->assign($shift, $member)->assertStatus(201);
        $this->assign($shift, $member)
            ->assertStatus(422)
            ->assertJsonValidationErrorFor('memberId');
    }

    public function test_double_booking_across_teams_is_rejected(): void
    {
        // The shared-worker invariant: one member, two teams, overlapping shifts.
        $member = Member::factory()->create();
        $teamA = Team::factory()->create();
        $teamB = Team::factory()->create();
        $teamA->members()->attach($member);
        $teamB->members()->attach($member);
        $this->actingAsOwner($teamA->organization);

        $shiftA = $this->shift($teamA, '2026-06-15 09:00:00', '2026-06-15 17:00:00');
        $shiftB = $this->shift($teamB, '2026-06-15 12:00:00', '2026-06-15 20:00:00'); // overlaps A

        $this->assign($shiftA, $member)->assertStatus(201);
        $this->assign($shiftB, $member)
            ->assertStatus(422)
            ->assertJsonValidationErrorFor('memberId');
    }

    public function test_non_overlapping_shifts_in_different_teams_are_allowed(): void
    {
        $member = Member::factory()->create();
        $teamA = Team::factory()->create();
        $teamB = Team::factory()->create();
        $teamA->members()->attach($member);
        $teamB->members()->attach($member);
        $this->actingAsOwner($teamA->organization);

        $shiftA = $this->shift($teamA, '2026-06-15 09:00:00', '2026-06-15 17:00:00');
        $shiftB = $this->shift($teamB, '2026-06-15 18:00:00', '2026-06-15 22:00:00'); // after A

        $this->assign($shiftA, $member)->assertStatus(201);
        $this->assign($shiftB, $member)->assertStatus(201);
    }
}

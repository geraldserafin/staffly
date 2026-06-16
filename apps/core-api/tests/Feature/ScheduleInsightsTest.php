<?php

namespace Tests\Feature;

use App\Members\Models\Member;
use App\Scheduling\Enums\SolveStatus;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use App\Scheduling\Models\ShiftAssignment;
use App\Scheduling\Models\ShiftRequirement;
use App\Scheduling\Models\SolveRun;
use App\ShiftTemplates\Enums\RequirementType;
use App\Skills\Models\Skill;
use App\Teams\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ScheduleInsightsTest extends TestCase
{
    use RefreshDatabase;

    public function test_insights_report_workload_gaps_and_fairness(): void
    {
        $team = Team::factory()->create();
        $cook = Skill::factory()->create();
        $bar = Skill::factory()->create();

        $worker = Member::factory()->create();
        $idle = Member::factory()->create();
        $team->members()->attach([$worker->id, $idle->id]);
        DB::table('member_skill')->insert(['member_id' => $worker->id, 'skill_id' => $cook->id]);

        $schedule = Schedule::factory()->create(['team_id' => $team->id]);

        // shift1: 8h, needs 2 cooks (only 1 assigned) and bar coverage (nobody has it).
        $shift1 = ScheduledShift::factory()->create([
            'schedule_id' => $schedule->id,
            'start_at' => '2026-06-15 09:00:00',
            'end_at' => '2026-06-15 17:00:00',
        ]);
        ShiftRequirement::factory()->create([
            'scheduled_shift_id' => $shift1->id, 'skill_id' => $cook->id,
            'type' => RequirementType::Headcount, 'count' => 2,
        ]);
        ShiftRequirement::factory()->create([
            'scheduled_shift_id' => $shift1->id, 'skill_id' => $bar->id,
            'type' => RequirementType::Coverage, 'count' => null,
        ]);

        // shift2: needs 1 (Any), nobody assigned.
        $shift2 = ScheduledShift::factory()->create([
            'schedule_id' => $schedule->id,
            'start_at' => '2026-06-16 09:00:00',
            'end_at' => '2026-06-16 13:00:00',
        ]);
        ShiftRequirement::factory()->create([
            'scheduled_shift_id' => $shift2->id, 'skill_id' => null,
            'type' => RequirementType::Headcount, 'count' => 1,
        ]);

        $assignment = new ShiftAssignment;
        $assignment->scheduled_shift_id = $shift1->id;
        $assignment->member_id = $worker->id;
        $assignment->locked = false;
        $assignment->save();

        $run = new SolveRun;
        $run->schedule()->associate($schedule);
        $run->status = SolveStatus::Succeeded;
        $run->diagnostics = ['memberDissatisfaction' => [$worker->id => 100000]];
        $run->save();

        $body = $this->getJson("schedules/{$schedule->id}/insights")->assertOk()->json();

        $members = collect($body['members'])->keyBy('memberId');
        $this->assertSame(1, $members[$worker->id]['assignedShifts']);
        $this->assertEqualsWithDelta(8.0, $members[$worker->id]['hours'], 0.001);
        $this->assertSame(100000, $members[$worker->id]['dissatisfaction']);
        $this->assertSame(0, $members[$idle->id]['assignedShifts']);
        $this->assertEqualsWithDelta(0.0, $members[$idle->id]['hours'], 0.001);
        $this->assertNull($members[$idle->id]['dissatisfaction']);

        // Three gaps: cook short by 1, bar uncovered, shift2 short by 1.
        $gaps = collect($body['staffingGaps']);
        $this->assertCount(3, $gaps);
        $cookGap = $gaps->firstWhere('skillId', $cook->id);
        $this->assertSame(['required' => 2, 'assigned' => 1, 'short' => 1], [
            'required' => $cookGap['required'], 'assigned' => $cookGap['assigned'], 'short' => $cookGap['short'],
        ]);
        $this->assertFalse($gaps->firstWhere('skillId', $bar->id)['covered']);

        $this->assertSame(100000, $body['fairness']['totalDissatisfaction']);
        $this->assertSame(100000, $body['fairness']['maxDissatisfaction']);
        $this->assertSame(1, $body['fairness']['members']);
        $this->assertTrue($body['fairness']['fromLastSolve']);
    }

    public function test_insights_without_a_solve_report_null_satisfaction(): void
    {
        $team = Team::factory()->create();
        $member = Member::factory()->create();
        $team->members()->attach($member);
        $schedule = Schedule::factory()->create(['team_id' => $team->id]);

        $body = $this->getJson("schedules/{$schedule->id}/insights")->assertOk()->json();

        $this->assertNull($body['members'][0]['dissatisfaction']);
        $this->assertFalse($body['fairness']['fromLastSolve']);
        $this->assertSame([], $body['staffingGaps']);
    }
}

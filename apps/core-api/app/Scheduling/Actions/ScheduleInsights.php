<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Enums\SolveStatus;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\SolveRun;
use App\ShiftTemplates\Enums\RequirementType;
use Illuminate\Support\Facades\DB;

/**
 * Aggregates a schedule into a manager-facing report: per-member workload (live,
 * from current assignments), staffing gaps (live), and satisfaction/fairness
 * (a snapshot from the latest succeeded solve — dissatisfaction is the solver's
 * to compute, so it can be stale after manual edits).
 */
class ScheduleInsights
{
    /**
     * @return array<string, mixed>
     */
    public function handle(Schedule $schedule): array
    {
        $schedule->loadMissing(['team.members', 'shifts.requirements', 'shifts.assignments']);

        $members = $schedule->team->members;
        $skills = $this->skillsByMember($members->modelKeys());
        $dissatisfaction = $this->lastSolveDissatisfaction($schedule);

        $hoursByShift = [];
        $assignedByShift = []; // shiftId => list<memberId>
        foreach ($schedule->shifts as $shift) {
            $hoursByShift[$shift->id] = round($shift->start_at->diffInMinutes($shift->end_at) / 60, 2);
            $assignedByShift[$shift->id] = $shift->assignments->pluck('member_id')->all();
        }

        return [
            'members' => $members->map(function ($member) use ($schedule, $hoursByShift, $assignedByShift, $dissatisfaction) {
                $myShifts = array_keys(array_filter(
                    $assignedByShift,
                    fn (array $memberIds) => in_array($member->getKey(), $memberIds, true),
                ));

                return [
                    'memberId' => $member->getKey(),
                    'name' => $member->name,
                    'assignedShifts' => count($myShifts),
                    'hours' => round(array_sum(array_map(fn ($sid) => $hoursByShift[$sid], $myShifts)), 2),
                    'dissatisfaction' => $dissatisfaction[$member->getKey()] ?? null,
                ];
            })->values()->all(),
            'staffingGaps' => $this->staffingGaps($schedule, $skills, $assignedByShift),
            'fairness' => $this->fairness($dissatisfaction),
        ];
    }

    /**
     * @param  array<string, list<string>>  $skills
     * @param  array<string, list<string>>  $assignedByShift
     * @return list<array<string, mixed>>
     */
    private function staffingGaps(Schedule $schedule, array $skills, array $assignedByShift): array
    {
        $gaps = [];

        foreach ($schedule->shifts as $shift) {
            $assigned = $assignedByShift[$shift->id];

            foreach ($shift->requirements as $requirement) {
                $skillId = $requirement->skill_id;
                $qualified = array_values(array_filter(
                    $assigned,
                    fn (string $memberId) => $skillId === null || in_array($skillId, $skills[$memberId] ?? [], true),
                ));

                if ($requirement->type === RequirementType::Headcount) {
                    $short = max(0, (int) $requirement->count - count($qualified));
                    if ($short > 0) {
                        $gaps[] = [
                            'shiftId' => $shift->id,
                            'startAt' => $shift->start_at->toIso8601String(),
                            'type' => RequirementType::Headcount->value,
                            'skillId' => $skillId,
                            'required' => (int) $requirement->count,
                            'assigned' => count($qualified),
                            'short' => $short,
                        ];
                    }
                } elseif ($qualified === []) {
                    $gaps[] = [
                        'shiftId' => $shift->id,
                        'startAt' => $shift->start_at->toIso8601String(),
                        'type' => RequirementType::Coverage->value,
                        'skillId' => $skillId,
                        'covered' => false,
                    ];
                }
            }
        }

        return $gaps;
    }

    /**
     * @param  array<string, int>  $dissatisfaction
     * @return array<string, mixed>
     */
    private function fairness(array $dissatisfaction): array
    {
        $values = array_values($dissatisfaction);

        return [
            'members' => count($values),
            'totalDissatisfaction' => array_sum($values),
            'maxDissatisfaction' => $values === [] ? 0 : max($values),
            'fromLastSolve' => $values !== [],
        ];
    }

    /**
     * @param  list<string>  $memberIds
     * @return array<string, list<string>>
     */
    private function skillsByMember(array $memberIds): array
    {
        if ($memberIds === []) {
            return [];
        }

        return DB::table('member_skill')
            ->whereIn('member_id', $memberIds)
            ->get(['member_id', 'skill_id'])
            ->groupBy('member_id')
            ->map(fn ($rows) => $rows->pluck('skill_id')->all())
            ->all();
    }

    /**
     * @return array<string, int>
     */
    private function lastSolveDissatisfaction(Schedule $schedule): array
    {
        $run = (new SolveRun)->newQuery()
            ->where('schedule_id', $schedule->getKey())
            ->where('status', SolveStatus::Succeeded->value)
            ->latest()
            ->latest('id')
            ->first();

        $values = $run?->diagnostics['memberDissatisfaction'] ?? null;

        return is_array($values) ? $values : [];
    }
}

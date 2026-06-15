<?php

namespace App\Scheduling\Solver;

use App\Availability\Services\MemberAvailabilityResolver;
use App\Scheduling\Enums\ScheduleStatus;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ShiftAssignment;
use App\Scheduling\Models\TeamRule;
use App\Skills\Models\Skill;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Flattens a schedule into the solver contract: concrete shifts + members with
 * resolved eligibility (availability + no prior-commitment clash) + skills,
 * locked assignments, and the team's hard rules.
 */
class SolveRequestBuilder
{
    public function __construct(
        private readonly MemberAvailabilityResolver $resolver,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Schedule $schedule): array
    {
        $schedule->loadMissing(['team', 'shifts.requirements']);
        $team = $schedule->team;

        $periodStart = $schedule->start_date->copy()->startOfDay();
        $periodEnd = $schedule->end_date->copy()->endOfDay();

        $rule = (new TeamRule)->newQuery()->where('team_id', $team->getKey())->first();
        $defaultRest = $rule?->min_rest_hours;

        $shifts = $schedule->shifts->map(fn ($shift) => [
            'id' => $shift->id,
            'startAt' => $shift->start_at->toIso8601String(),
            'endAt' => $shift->end_at->toIso8601String(),
            // Per-shift rest overrides the team default; null = no rest constraint.
            'restHoursAfter' => $shift->rest_hours_after ?? $defaultRest,
            'requirements' => $shift->requirements->map(fn ($requirement) => [
                'type' => $requirement->type->value,
                'skillId' => $requirement->skill_id,
                'count' => $requirement->count,
            ])->all(),
        ])->all();

        $members = $team->members()->get()->map(function ($member) use ($schedule, $periodStart, $periodEnd) {
            $skills = (new Skill)->newQuery()
                ->whereHas('members', fn (Builder $query) => $query->whereKey($member->getKey()))
                ->pluck('id')
                ->all();

            $prior = $this->priorCommitments($member->getKey(), $schedule, $periodStart, $periodEnd);

            $eligible = $schedule->shifts->filter(function ($shift) use ($member, $prior) {
                if (! $this->resolver->isAvailable($member, $shift->start_at, $shift->end_at)) {
                    return false;
                }

                foreach ($prior as [$start, $end]) {
                    if ($start->lessThan($shift->end_at) && $end->greaterThan($shift->start_at)) {
                        return false; // clashes with a commitment in another (published) team's schedule
                    }
                }

                return true;
            })->pluck('id')->values()->all();

            return [
                'id' => $member->id,
                'skills' => $skills,
                'maxHoursPerWeek' => $member->max_hours_per_week,
                'eligibleShiftIds' => $eligible,
            ];
        })->all();

        $locked = (new ShiftAssignment)->newQuery()
            ->where('locked', true)
            ->whereHas('shift', fn (Builder $query) => $query->where('schedule_id', $schedule->getKey()))
            ->get(['scheduled_shift_id', 'member_id'])
            ->map(fn ($assignment) => [
                'shiftId' => $assignment->scheduled_shift_id,
                'memberId' => $assignment->member_id,
            ])->all();

        return [
            'scheduleId' => $schedule->id,
            'shifts' => $shifts,
            'members' => $members,
            'locked' => $locked,
            'rules' => [
                'minRestHours' => $rule?->min_rest_hours,
                'maxHoursPerWeek' => $rule?->max_hours_per_week,
                'maxConsecutiveDays' => $rule?->max_consecutive_days,
            ],
        ];
    }

    /**
     * Intervals this member is already committed to in OTHER published schedules.
     *
     * @return list<array{0: CarbonInterface, 1: CarbonInterface}>
     */
    private function priorCommitments(string $memberId, Schedule $schedule, CarbonInterface $periodStart, CarbonInterface $periodEnd): array
    {
        return (new ShiftAssignment)->newQuery()
            ->where('member_id', $memberId)
            ->whereHas('shift', function (Builder $query) use ($schedule, $periodStart, $periodEnd) {
                $query->where('start_at', '<', $periodEnd)
                    ->where('end_at', '>', $periodStart)
                    ->whereHas('schedule', fn (Builder $inner) => $inner
                        ->where('status', ScheduleStatus::Published->value)
                        ->whereKeyNot($schedule->getKey()));
            })
            ->with('shift')
            ->get()
            ->map(fn ($assignment) => [$assignment->shift->start_at, $assignment->shift->end_at])
            ->all();
    }
}

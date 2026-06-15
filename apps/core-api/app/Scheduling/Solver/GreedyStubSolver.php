<?php

namespace App\Scheduling\Solver;

use App\ShiftTemplates\Enums\RequirementType;
use Carbon\Carbon;

/**
 * Placeholder solver: greedily fills headcount requirements with eligible,
 * skilled members, respecting availability (eligibility), no double-booking,
 * and locked assignments. Hours/rest/consecutive rules, coverage requirements,
 * fairness and preferences are left to the real OR-Tools solver.
 */
class GreedyStubSolver implements Solver
{
    /**
     * @param  array<string, mixed>  $request
     * @return array<string, mixed>
     */
    public function solve(array $request): array
    {
        $memberSkills = [];
        $eligible = [];
        foreach ($request['members'] as $member) {
            $memberSkills[$member['id']] = $member['skills'];
            $eligible[$member['id']] = $member['eligibleShiftIds'];
        }

        $start = [];
        $end = [];
        $rest = [];
        foreach ($request['shifts'] as $shift) {
            $start[$shift['id']] = Carbon::parse($shift['startAt']);
            $end[$shift['id']] = Carbon::parse($shift['endAt']);
            $rest[$shift['id']] = (int) ($shift['restHoursAfter'] ?? 0);
        }

        $assignments = [];
        $onShift = [];  // shiftId => [memberId => true]
        $busy = [];     // memberId => list<[Carbon start, Carbon end, int restHours]>

        foreach ($request['locked'] as $lock) {
            $assignments[] = $lock;
            $onShift[$lock['shiftId']][$lock['memberId']] = true;
            $busy[$lock['memberId']][] = [$start[$lock['shiftId']], $end[$lock['shiftId']], $rest[$lock['shiftId']]];
        }

        $shifts = $request['shifts'];
        usort($shifts, fn ($a, $b) => strcmp($a['startAt'], $b['startAt']));

        foreach ($shifts as $shift) {
            $shiftId = $shift['id'];

            foreach ($shift['requirements'] as $requirement) {
                if ($requirement['type'] !== RequirementType::Headcount->value) {
                    continue; // coverage requirements are the real solver's job
                }

                $skillId = $requirement['skillId'];
                $needed = (int) $requirement['count'];

                // Locked members already on this shift count toward the requirement.
                foreach (array_keys($onShift[$shiftId] ?? []) as $memberId) {
                    if ($skillId === null || in_array($skillId, $memberSkills[$memberId] ?? [], true)) {
                        $needed--;
                    }
                }

                foreach ($request['members'] as $member) {
                    if ($needed <= 0) {
                        break;
                    }

                    $memberId = $member['id'];

                    if (! in_array($shiftId, $eligible[$memberId], true)) {
                        continue;
                    }
                    if ($skillId !== null && ! in_array($skillId, $memberSkills[$memberId], true)) {
                        continue;
                    }
                    if (isset($onShift[$shiftId][$memberId])) {
                        continue;
                    }
                    if ($this->clashes($busy[$memberId] ?? [], $start[$shiftId], $end[$shiftId], $rest[$shiftId])) {
                        continue;
                    }

                    $assignments[] = ['shiftId' => $shiftId, 'memberId' => $memberId];
                    $onShift[$shiftId][$memberId] = true;
                    $busy[$memberId][] = [$start[$shiftId], $end[$shiftId], $rest[$shiftId]];
                    $needed--;
                }

                if ($needed > 0) {
                    $unfilled[] = ['shiftId' => $shiftId, 'skillId' => $skillId, 'short' => $needed];
                }
            }
        }

        return [
            'assignments' => $assignments,
            'diagnostics' => [
                'solver' => 'greedy-stub',
                'unfilled' => $unfilled ?? [],
                'note' => 'hours/rest/consecutive limits, coverage requirements, fairness and preferences are enforced only by the real solver',
            ],
        ];
    }

    /**
     * Conflict if the gap to a busy shift is shorter than the rest the earlier
     * shift requires (overlap = negative gap).
     *
     * @param  list<array{0: Carbon, 1: Carbon, 2: int}>  $busy
     */
    private function clashes(array $busy, Carbon $start, Carbon $end, int $rest): bool
    {
        foreach ($busy as [$bStart, $bEnd, $bRest]) {
            if ($bStart->lessThanOrEqualTo($start)) {
                $earlierEnd = $bEnd;
                $earlierRest = $bRest;
                $laterStart = $start;
            } else {
                $earlierEnd = $end;
                $earlierRest = $rest;
                $laterStart = $bStart;
            }

            $gapHours = $earlierEnd->diffInMinutes($laterStart, false) / 60;
            if ($gapHours < $earlierRest) {
                return true;
            }
        }

        return false;
    }
}

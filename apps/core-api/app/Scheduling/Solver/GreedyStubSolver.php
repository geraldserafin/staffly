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
        foreach ($request['shifts'] as $shift) {
            $start[$shift['id']] = Carbon::parse($shift['startAt']);
            $end[$shift['id']] = Carbon::parse($shift['endAt']);
        }

        $assignments = [];
        $onShift = [];  // shiftId => [memberId => true]
        $busy = [];     // memberId => list<[Carbon, Carbon]>

        foreach ($request['locked'] as $lock) {
            $assignments[] = $lock;
            $onShift[$lock['shiftId']][$lock['memberId']] = true;
            $busy[$lock['memberId']][] = [$start[$lock['shiftId']], $end[$lock['shiftId']]];
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
                    if ($this->clashes($busy[$memberId] ?? [], $start[$shiftId], $end[$shiftId])) {
                        continue;
                    }

                    $assignments[] = ['shiftId' => $shiftId, 'memberId' => $memberId];
                    $onShift[$shiftId][$memberId] = true;
                    $busy[$memberId][] = [$start[$shiftId], $end[$shiftId]];
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
     * @param  list<array{0: Carbon, 1: Carbon}>  $busy
     */
    private function clashes(array $busy, Carbon $start, Carbon $end): bool
    {
        foreach ($busy as [$bStart, $bEnd]) {
            if ($bStart->lessThan($end) && $bEnd->greaterThan($start)) {
                return true;
            }
        }

        return false;
    }
}

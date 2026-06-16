<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ShiftAssignment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Writes a set of assignments onto a schedule's live draft: the non-locked rows
 * are replaced, locked rows are kept untouched. Shared by SolveSchedule (apply a
 * fresh solve) and ApplyRun (re-apply / revert to a stored run's snapshot).
 */
class ApplyAssignments
{
    /**
     * @param  list<array{shiftId: string, memberId: string}>  $assignments
     */
    public function handle(Schedule $schedule, array $assignments): void
    {
        $lockedKeys = (new ShiftAssignment)->newQuery()
            ->where('locked', true)
            ->whereHas('shift', fn (Builder $query) => $query->where('schedule_id', $schedule->getKey()))
            ->get(['scheduled_shift_id', 'member_id'])
            ->mapWithKeys(fn ($row) => [$row->scheduled_shift_id.':'.$row->member_id => true])
            ->all();

        DB::transaction(function () use ($schedule, $lockedKeys, $assignments): void {
            (new ShiftAssignment)->newQuery()
                ->where('locked', false)
                ->whereHas('shift', fn (Builder $query) => $query->where('schedule_id', $schedule->getKey()))
                ->delete();

            foreach ($assignments as $assignment) {
                if (isset($lockedKeys[$assignment['shiftId'].':'.$assignment['memberId']])) {
                    continue; // locked rows already persisted
                }

                $row = new ShiftAssignment;
                $row->scheduled_shift_id = $assignment['shiftId'];
                $row->member_id = $assignment['memberId'];
                $row->locked = false;
                $row->save();
            }
        });
    }
}

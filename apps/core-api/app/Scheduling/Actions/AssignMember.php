<?php

namespace App\Scheduling\Actions;

use App\Members\Models\Member;
use App\Scheduling\Models\ScheduledShift;
use App\Scheduling\Models\ShiftAssignment;

class AssignMember
{
    /**
     * Conflict checks (team membership, double-booking, duplicates) are enforced
     * by StoreAssignmentRequest before this runs.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(ScheduledShift $shift, Member $member, array $data): ShiftAssignment
    {
        $assignment = new ShiftAssignment($data);
        $assignment->shift()->associate($shift);
        $assignment->member()->associate($member);
        $assignment->save();

        return $assignment;
    }
}

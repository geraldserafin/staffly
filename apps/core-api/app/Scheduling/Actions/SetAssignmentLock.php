<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\ShiftAssignment;

class SetAssignmentLock
{
    public function handle(ShiftAssignment $assignment, bool $locked): ShiftAssignment
    {
        $assignment->locked = $locked;
        $assignment->save();

        return $assignment;
    }
}

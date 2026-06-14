<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\ScheduledShift;
use App\Scheduling\Models\ShiftAssignment;
use Illuminate\Database\Eloquent\Collection;

class ListShiftAssignments
{
    /**
     * @return Collection<int, ShiftAssignment>
     */
    public function handle(ScheduledShift $shift): Collection
    {
        return $shift->assignments()->get();
    }
}

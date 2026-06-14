<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\ScheduledShift;
use App\Scheduling\Models\ShiftRequirement;

class AddShiftRequirement
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(ScheduledShift $shift, array $data): ShiftRequirement
    {
        $requirement = new ShiftRequirement($data);
        $requirement->shift()->associate($shift);
        $requirement->save();

        return $requirement;
    }
}

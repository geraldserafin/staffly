<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\ShiftRequirement;

class RemoveShiftRequirement
{
    public function handle(ShiftRequirement $requirement): void
    {
        $requirement->delete();
    }
}

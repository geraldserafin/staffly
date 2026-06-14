<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\ScheduledShift;

class DeleteShift
{
    public function handle(ScheduledShift $shift): void
    {
        $shift->delete();
    }
}

<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\Schedule;

class DeleteSchedule
{
    public function handle(Schedule $schedule): void
    {
        $schedule->delete();
    }
}

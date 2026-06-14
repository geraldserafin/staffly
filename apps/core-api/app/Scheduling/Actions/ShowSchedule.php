<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\Schedule;

class ShowSchedule
{
    public function handle(Schedule $schedule): Schedule
    {
        return $schedule->load(['shifts.requirements', 'shifts.assignments']);
    }
}

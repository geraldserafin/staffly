<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Enums\ScheduleStatus;
use App\Scheduling\Models\Schedule;

class ArchiveSchedule
{
    public function handle(Schedule $schedule): Schedule
    {
        $schedule->status = ScheduleStatus::Archived;
        $schedule->save();

        return $schedule;
    }
}

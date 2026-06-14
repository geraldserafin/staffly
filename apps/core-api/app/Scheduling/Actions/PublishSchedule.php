<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Enums\ScheduleStatus;
use App\Scheduling\Models\Schedule;

class PublishSchedule
{
    public function handle(Schedule $schedule): Schedule
    {
        $schedule->status = ScheduleStatus::Published;
        $schedule->save();

        return $schedule;
    }
}

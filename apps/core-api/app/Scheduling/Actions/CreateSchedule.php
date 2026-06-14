<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Enums\ScheduleStatus;
use App\Scheduling\Models\Schedule;
use App\Teams\Models\Team;

class CreateSchedule
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Team $team, array $data): Schedule
    {
        $schedule = new Schedule($data);
        $schedule->status = ScheduleStatus::Draft;
        $schedule->team()->associate($team);
        $schedule->save();

        return $schedule;
    }
}

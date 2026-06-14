<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\Schedule;

class UpdateSchedule
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Schedule $schedule, array $data): Schedule
    {
        $schedule->update($data);

        return $schedule;
    }
}

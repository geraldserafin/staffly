<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;

class CreateShift
{
    /**
     * Add an ad-hoc shift to a schedule (the "include extra day" case).
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(Schedule $schedule, array $data): ScheduledShift
    {
        $shift = new ScheduledShift($data);
        $shift->schedule()->associate($schedule);
        $shift->save();

        return $shift;
    }
}

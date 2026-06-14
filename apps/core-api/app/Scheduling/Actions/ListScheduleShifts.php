<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use Illuminate\Database\Eloquent\Collection;

class ListScheduleShifts
{
    /**
     * @return Collection<int, ScheduledShift>
     */
    public function handle(Schedule $schedule): Collection
    {
        return (new ScheduledShift)->newQuery()
            ->where('schedule_id', $schedule->getKey())
            ->with(['requirements', 'assignments'])
            ->orderBy('start_at')
            ->get();
    }
}

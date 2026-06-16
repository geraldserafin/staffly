<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\SolveRun;
use Illuminate\Database\Eloquent\Collection;

/**
 * A schedule's solve runs, newest first — the candidates a manager compares
 * (diagnostics + retained snapshot) before applying one.
 */
class ListScheduleRuns
{
    /**
     * @return Collection<int, SolveRun>
     */
    public function handle(Schedule $schedule): Collection
    {
        return (new SolveRun)->newQuery()
            ->where('schedule_id', $schedule->getKey())
            ->latest()
            ->latest('id')
            ->get();
    }
}

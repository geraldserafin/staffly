<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Enums\SolveStatus;
use App\Scheduling\Jobs\SolveScheduleJob;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\SolveRun;

/**
 * Queues a solve: records a pending SolveRun and dispatches the job that does
 * the work. Returns the run immediately so the request doesn't block on the
 * optimizer; the client polls GET /solve-runs/{id} for the outcome.
 */
class QueueSolve
{
    public function handle(Schedule $schedule): SolveRun
    {
        $run = new SolveRun;
        $run->status = SolveStatus::Pending;
        $run->schedule()->associate($schedule);
        $run->save();

        SolveScheduleJob::dispatch($run);

        return $run;
    }
}

<?php

namespace App\Scheduling\Http\Controllers;

use App\Scheduling\Actions\QueueSolve;
use App\Scheduling\Http\Resources\SolveRunResource;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\SolveRun;
use Illuminate\Http\JsonResponse;

class SolveController
{
    public function solve(Schedule $schedule, QueueSolve $action): JsonResponse
    {
        $run = $action->handle($schedule);

        // 202: the solve is queued; poll GET /solve-runs/{id} for the outcome.
        return SolveRunResource::make($run)
            ->response()
            ->setStatusCode(JsonResponse::HTTP_ACCEPTED);
    }

    public function show(SolveRun $solveRun): SolveRunResource
    {
        return SolveRunResource::make($solveRun);
    }
}

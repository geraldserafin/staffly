<?php

namespace App\Scheduling\Http\Controllers;

use App\Scheduling\Actions\SolveSchedule;
use App\Scheduling\Http\Resources\SolveRunResource;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\SolveRun;
use Illuminate\Http\JsonResponse;

class SolveController
{
    public function solve(Schedule $schedule, SolveSchedule $action): JsonResponse
    {
        $run = $action->handle($schedule);

        return SolveRunResource::make($run)
            ->response()
            ->setStatusCode(JsonResponse::HTTP_CREATED);
    }

    public function show(SolveRun $solveRun): SolveRunResource
    {
        return SolveRunResource::make($solveRun);
    }
}

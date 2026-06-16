<?php

namespace App\Scheduling\Http\Controllers;

use App\Scheduling\Actions\ApplyRun;
use App\Scheduling\Actions\ListScheduleRuns;
use App\Scheduling\Actions\PreviewSolve;
use App\Scheduling\Actions\QueueSolve;
use App\Scheduling\Actions\ScheduleInsights;
use App\Scheduling\Http\Requests\PreviewSolveRequest;
use App\Scheduling\Http\Resources\SolveRunResource;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\SolveRun;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpKernel\Exception\HttpException;

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

    public function preview(PreviewSolveRequest $request, Schedule $schedule, PreviewSolve $action): JsonResponse
    {
        $lambda = $request->validated('lambda');

        return new JsonResponse($action->handle($schedule, $lambda !== null ? (float) $lambda : null));
    }

    public function show(SolveRun $solveRun): SolveRunResource
    {
        return SolveRunResource::make($solveRun);
    }

    public function runs(Schedule $schedule, ListScheduleRuns $action): AnonymousResourceCollection
    {
        return SolveRunResource::collection($action->handle($schedule));
    }

    public function insights(Schedule $schedule, ScheduleInsights $action): JsonResponse
    {
        return new JsonResponse($action->handle($schedule));
    }

    public function apply(SolveRun $solveRun, ApplyRun $action): SolveRunResource
    {
        if (empty($solveRun->result_snapshot)) {
            throw new HttpException(JsonResponse::HTTP_UNPROCESSABLE_ENTITY, 'This run has no result to apply.');
        }

        $action->handle($solveRun);

        return SolveRunResource::make($solveRun);
    }
}

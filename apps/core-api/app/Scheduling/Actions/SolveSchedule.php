<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Enums\SolveStatus;
use App\Scheduling\Models\SolveRun;
use App\Scheduling\Solver\Solver;
use App\Scheduling\Solver\SolveRequestBuilder;
use Throwable;

/**
 * Executes a previously-queued solve run: build the request, solve, apply the
 * result to the live draft, and retain it as the run's snapshot. Runs inside a
 * queued job (see SolveScheduleJob); the pending SolveRun is created up front by
 * QueueSolve so the request can return immediately while this happens out of band.
 */
class SolveSchedule
{
    public function __construct(
        private readonly SolveRequestBuilder $builder,
        private readonly Solver $solver,
        private readonly ApplyAssignments $apply,
    ) {}

    public function execute(SolveRun $run): void
    {
        $run->status = SolveStatus::Running;
        $run->save();

        try {
            $schedule = $run->schedule;
            $request = $this->builder->build($schedule);
            $response = $this->solver->solve($request);

            $this->apply->handle($schedule, $response['assignments']);

            $run->status = SolveStatus::Succeeded;
            $run->diagnostics = $response['diagnostics'];
            $run->result_snapshot = $response['assignments'];
        } catch (Throwable $e) {
            $run->status = SolveStatus::Failed;
            $run->diagnostics = ['error' => $e->getMessage()];
        }

        $run->save();
    }
}

<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\Schedule;
use App\Scheduling\Solver\Solver;
use App\Scheduling\Solver\SolveRequestBuilder;

/**
 * Dry-run solve: returns the assignments + diagnostics a solve would produce for
 * a candidate equity dial, WITHOUT writing assignments or recording a SolveRun.
 * Powers live λ tweaking — the manager scrubs the dial and sees the reshuffle
 * before committing via POST /solve. Locked assignments are still honored.
 */
class PreviewSolve
{
    public function __construct(
        private readonly SolveRequestBuilder $builder,
        private readonly Solver $solver,
    ) {}

    /**
     * @return array{assignments: list<array{shiftId: string, memberId: string}>, diagnostics: array<string, mixed>}
     */
    public function handle(Schedule $schedule, ?float $lambda = null): array
    {
        $request = $this->builder->build($schedule);

        if ($lambda !== null) {
            $request['objective']['lambda'] = $lambda;
        }

        $response = $this->solver->solve($request);

        return [
            'assignments' => $response['assignments'],
            'diagnostics' => $response['diagnostics'],
        ];
    }
}

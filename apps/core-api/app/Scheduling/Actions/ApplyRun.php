<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\SolveRun;

/**
 * Re-applies a stored run's assignment snapshot to the live draft — how a manager
 * picks the best of several runs, or reverts to an earlier one after a re-solve.
 * Locked assignments are preserved (see ApplyAssignments).
 */
class ApplyRun
{
    public function __construct(
        private readonly ApplyAssignments $apply,
    ) {}

    public function handle(SolveRun $run): void
    {
        $this->apply->handle($run->schedule, $run->result_snapshot ?? []);
    }
}

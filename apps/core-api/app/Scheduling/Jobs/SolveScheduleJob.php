<?php

namespace App\Scheduling\Jobs;

use App\Scheduling\Actions\SolveSchedule;
use App\Scheduling\Enums\SolveStatus;
use App\Scheduling\Models\SolveRun;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SolveScheduleJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    // A solve is a fresh optimization, not a retriable side effect: one attempt,
    // and SolveSchedule already records failures on the run itself.
    public int $tries = 1;

    public function __construct(public readonly SolveRun $run) {}

    public function handle(SolveSchedule $action): void
    {
        $action->execute($this->run);
    }

    /**
     * If the job itself fails (e.g. the worker is killed mid-solve), the run
     * must not be left stuck on `running`.
     */
    public function failed(?Throwable $e): void
    {
        $this->run->status = SolveStatus::Failed;
        $this->run->diagnostics = ['error' => $e?->getMessage() ?? 'solve job failed'];
        $this->run->save();
    }
}

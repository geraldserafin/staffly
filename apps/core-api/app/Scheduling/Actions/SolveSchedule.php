<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Enums\SolveStatus;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ShiftAssignment;
use App\Scheduling\Models\SolveRun;
use App\Scheduling\Solver\Solver;
use App\Scheduling\Solver\SolveRequestBuilder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Throwable;

class SolveSchedule
{
    public function __construct(
        private readonly SolveRequestBuilder $builder,
        private readonly Solver $solver,
    ) {}

    public function handle(Schedule $schedule): SolveRun
    {
        $run = new SolveRun;
        $run->status = SolveStatus::Pending;
        $run->schedule()->associate($schedule);
        $run->save();

        try {
            $request = $this->builder->build($schedule);
            $response = $this->solver->solve($request);

            $this->apply($schedule, $request['locked'], $response['assignments']);

            $run->status = SolveStatus::Succeeded;
            $run->diagnostics = $response['diagnostics'];
        } catch (Throwable $e) {
            $run->status = SolveStatus::Failed;
            $run->diagnostics = ['error' => $e->getMessage()];
        }

        $run->save();

        return $run;
    }

    /**
     * Replace the non-locked draft assignments with the solver's result;
     * locked assignments are left untouched.
     *
     * @param  list<array{shiftId: string, memberId: string}>  $locked
     * @param  list<array{shiftId: string, memberId: string}>  $assignments
     */
    private function apply(Schedule $schedule, array $locked, array $assignments): void
    {
        $lockedKeys = [];
        foreach ($locked as $lock) {
            $lockedKeys[$lock['shiftId'].':'.$lock['memberId']] = true;
        }

        DB::transaction(function () use ($schedule, $lockedKeys, $assignments): void {
            (new ShiftAssignment)->newQuery()
                ->where('locked', false)
                ->whereHas('shift', fn (Builder $query) => $query->where('schedule_id', $schedule->getKey()))
                ->delete();

            foreach ($assignments as $assignment) {
                if (isset($lockedKeys[$assignment['shiftId'].':'.$assignment['memberId']])) {
                    continue; // locked rows already persisted
                }

                $row = new ShiftAssignment;
                $row->scheduled_shift_id = $assignment['shiftId'];
                $row->member_id = $assignment['memberId'];
                $row->locked = false;
                $row->save();
            }
        });
    }
}

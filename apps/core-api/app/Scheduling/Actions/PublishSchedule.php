<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Enums\ScheduleStatus;
use App\Scheduling\Enums\SolveStatus;
use App\Scheduling\Models\MemberSatisfaction;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\SolveRun;
use Illuminate\Support\Facades\DB;

class PublishSchedule
{
    public function handle(Schedule $schedule): Schedule
    {
        DB::transaction(function () use ($schedule): void {
            $schedule->status = ScheduleStatus::Published;
            $schedule->save();

            $this->snapshotSatisfaction($schedule);
        });

        return $schedule;
    }

    /**
     * Persist each member's realised dissatisfaction from the latest succeeded
     * solve as this period's history record — the input to the equity bias on
     * future solves. Idempotent per (schedule, member): re-publishing updates.
     */
    private function snapshotSatisfaction(Schedule $schedule): void
    {
        $run = (new SolveRun)->newQuery()
            ->where('schedule_id', $schedule->getKey())
            ->where('status', SolveStatus::Succeeded->value)
            ->latest()
            ->latest('id') // tiebreak: UUIDv7 ids are time-ordered
            ->first();

        $dissatisfaction = $run?->diagnostics['memberDissatisfaction'] ?? null;
        if (! is_array($dissatisfaction)) {
            return; // stub solver / no soft prefs — nothing to record
        }

        foreach ($dissatisfaction as $memberId => $value) {
            $record = (new MemberSatisfaction)->newQuery()->firstOrNew([
                'schedule_id' => $schedule->getKey(),
                'member_id' => $memberId,
            ]);
            $record->member_id = $memberId;
            $record->team_id = $schedule->team_id;
            $record->schedule()->associate($schedule);
            $record->period_start = $schedule->start_date;
            $record->period_end = $schedule->end_date;
            $record->dissatisfaction = (int) $value;
            $record->save();
        }
    }
}

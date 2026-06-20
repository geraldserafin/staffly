<?php

namespace App\Members\Actions;

use App\Members\Models\Member;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ListMemberShifts
{
    /**
     * Return all scheduled shifts assigned to this member,
     * joined with the schedule + team for calendar display.
     *
     * @return list<array<string, mixed>>
     */
    public function handle(Member $member): array
    {
        return DB::table('shift_assignments')
            ->join('scheduled_shifts', 'scheduled_shifts.id', '=', 'shift_assignments.scheduled_shift_id')
            ->join('schedules', 'schedules.id', '=', 'scheduled_shifts.schedule_id')
            ->join('teams', 'teams.id', '=', 'schedules.team_id')
            ->where('shift_assignments.member_id', $member->id)
            ->select([
                'scheduled_shifts.id as shiftId',
                'scheduled_shifts.name as shiftName',
                'scheduled_shifts.start_at as startAt',
                'scheduled_shifts.end_at as endAt',
                'schedules.id as scheduleId',
                'schedules.name as scheduleName',
                'schedules.status as scheduleStatus',
                'teams.id as teamId',
                'teams.name as teamName',
                'shift_assignments.locked as locked',
            ])
            ->orderBy('scheduled_shifts.start_at', 'desc')
            ->get()
            ->map(fn ($row) => (array) $row)
            ->all();
    }
}

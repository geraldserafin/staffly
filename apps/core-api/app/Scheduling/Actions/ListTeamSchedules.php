<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\Schedule;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Collection;

class ListTeamSchedules
{
    /**
     * @return Collection<int, Schedule>
     */
    public function handle(Team $team): Collection
    {
        return (new Schedule)->newQuery()
            ->where('team_id', $team->getKey())
            ->get();
    }
}

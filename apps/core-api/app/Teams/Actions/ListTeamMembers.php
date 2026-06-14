<?php

namespace App\Teams\Actions;

use App\Members\Models\Member;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Collection;

class ListTeamMembers
{
    /**
     * @return Collection<int, Member>
     */
    public function handle(Team $team): Collection
    {
        return $team->members()->get();
    }
}

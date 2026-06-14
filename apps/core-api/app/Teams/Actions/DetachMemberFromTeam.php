<?php

namespace App\Teams\Actions;

use App\Members\Models\Member;
use App\Teams\Models\Team;

class DetachMemberFromTeam
{
    public function handle(Team $team, Member $member): void
    {
        $team->members()->detach($member->getKey());
    }
}

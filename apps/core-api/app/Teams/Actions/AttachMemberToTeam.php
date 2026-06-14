<?php

namespace App\Teams\Actions;

use App\Members\Models\Member;
use App\Teams\Models\Team;

class AttachMemberToTeam
{
    public function handle(Team $team, Member $member): void
    {
        // syncWithoutDetaching keeps it idempotent: re-attaching is a no-op, not a duplicate.
        $team->members()->syncWithoutDetaching([$member->getKey()]);
    }
}

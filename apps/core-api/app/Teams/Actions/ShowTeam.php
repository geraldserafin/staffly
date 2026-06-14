<?php

namespace App\Teams\Actions;

use App\Teams\Models\Team;

class ShowTeam
{
    public function handle(Team $team): Team
    {
        return $team;
    }
}

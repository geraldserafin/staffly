<?php

namespace App\Teams\Actions;

use App\Teams\Models\Team;

class DeleteTeam
{
    public function handle(Team $team): void
    {
        $team->delete();
    }
}

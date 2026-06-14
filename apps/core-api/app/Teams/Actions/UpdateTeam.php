<?php

namespace App\Teams\Actions;

use App\Teams\Models\Team;

class UpdateTeam
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Team $team, array $data): Team
    {
        $team->update($data);

        return $team;
    }
}

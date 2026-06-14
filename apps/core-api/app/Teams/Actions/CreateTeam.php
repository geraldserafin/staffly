<?php

namespace App\Teams\Actions;

use App\Organizations\Models\Organization;
use App\Teams\Models\Team;

class CreateTeam
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Organization $organization, array $data): Team
    {
        $team = new Team($data);
        $team->organization()->associate($organization);
        $team->save();

        return $team;
    }
}

<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\TeamRule;
use App\Teams\Models\Team;

class ShowTeamRules
{
    public function handle(Team $team): TeamRule
    {
        // Unsaved instance with null limits when none configured yet.
        return (new TeamRule)->newQuery()->firstOrNew(['team_id' => $team->getKey()]);
    }
}

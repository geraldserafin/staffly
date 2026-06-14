<?php

namespace App\Scheduling\Actions;

use App\Scheduling\Models\TeamRule;
use App\Teams\Models\Team;

class UpsertTeamRules
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Team $team, array $data): TeamRule
    {
        $rule = (new TeamRule)->newQuery()->firstOrNew(['team_id' => $team->getKey()]);
        $rule->fill($data);
        $rule->team()->associate($team);
        $rule->save();

        return $rule;
    }
}

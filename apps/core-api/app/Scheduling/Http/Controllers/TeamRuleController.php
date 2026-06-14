<?php

namespace App\Scheduling\Http\Controllers;

use App\Scheduling\Actions\ShowTeamRules;
use App\Scheduling\Actions\UpsertTeamRules;
use App\Scheduling\Http\Requests\UpdateTeamRulesRequest;
use App\Scheduling\Http\Resources\TeamRuleResource;
use App\Teams\Models\Team;

class TeamRuleController
{
    public function show(Team $team, ShowTeamRules $action): TeamRuleResource
    {
        return TeamRuleResource::make($action->handle($team));
    }

    public function update(UpdateTeamRulesRequest $request, Team $team, UpsertTeamRules $action): TeamRuleResource
    {
        return TeamRuleResource::make($action->handle($team, $request->validated()));
    }
}

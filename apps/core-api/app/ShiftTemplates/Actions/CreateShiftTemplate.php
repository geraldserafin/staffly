<?php

namespace App\ShiftTemplates\Actions;

use App\Organizations\Models\Organization;
use App\ShiftTemplates\Models\ShiftTemplate;

class CreateShiftTemplate
{
    /**
     * @param  array<string, mixed>  $data  validated attributes; `team_ids` (if
     *                                       present) scopes the template to those
     *                                       teams — absent/empty = all teams.
     */
    public function handle(Organization $organization, array $data): ShiftTemplate
    {
        $teamIds = $data['team_ids'] ?? [];
        unset($data['team_ids']);

        $template = new ShiftTemplate($data);
        $template->organization()->associate($organization);
        $template->save();

        $template->teams()->sync($teamIds);

        return $template->load('teams');
    }
}

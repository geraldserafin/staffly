<?php

namespace App\ShiftTemplates\Actions;

use App\ShiftTemplates\Models\ShiftTemplate;
use App\Teams\Models\Team;

class DetachTemplateFromTeam
{
    public function handle(ShiftTemplate $template, Team $team): ShiftTemplate
    {
        $template->teams()->detach($team->getKey());

        return $template->load('teams');
    }
}

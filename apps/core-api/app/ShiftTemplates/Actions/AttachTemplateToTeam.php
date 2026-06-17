<?php

namespace App\ShiftTemplates\Actions;

use App\ShiftTemplates\Models\ShiftTemplate;
use App\Teams\Models\Team;

class AttachTemplateToTeam
{
    /**
     * Scope a template to a team (idempotent). Note: attaching the first team
     * narrows an org-wide template to only the attached team(s).
     */
    public function handle(ShiftTemplate $template, Team $team): ShiftTemplate
    {
        $template->teams()->syncWithoutDetaching([$team->getKey()]);

        return $template->load('teams');
    }
}

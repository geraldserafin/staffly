<?php

namespace App\ShiftTemplates\Actions;

use App\Organizations\Models\Organization;
use App\ShiftTemplates\Models\ShiftTemplate;
use App\Teams\Models\Team;

class CreateShiftTemplate
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Organization $organization, ?Team $team, array $data): ShiftTemplate
    {
        $template = new ShiftTemplate($data);
        $template->organization()->associate($organization);
        $template->team()->associate($team);
        $template->save();

        return $template;
    }
}

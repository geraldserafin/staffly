<?php

namespace App\ShiftTemplates\Actions;

use App\ShiftTemplates\Models\ShiftTemplate;

class ShowShiftTemplate
{
    public function handle(ShiftTemplate $template): ShiftTemplate
    {
        return $template->load(['requirements', 'teams']);
    }
}

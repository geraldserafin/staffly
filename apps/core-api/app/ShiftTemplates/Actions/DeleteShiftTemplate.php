<?php

namespace App\ShiftTemplates\Actions;

use App\ShiftTemplates\Models\ShiftTemplate;

class DeleteShiftTemplate
{
    public function handle(ShiftTemplate $template): void
    {
        $template->delete();
    }
}

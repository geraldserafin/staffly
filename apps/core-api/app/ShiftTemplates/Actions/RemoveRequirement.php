<?php

namespace App\ShiftTemplates\Actions;

use App\ShiftTemplates\Models\ShiftTemplateRequirement;

class RemoveRequirement
{
    public function handle(ShiftTemplateRequirement $requirement): void
    {
        $requirement->delete();
    }
}

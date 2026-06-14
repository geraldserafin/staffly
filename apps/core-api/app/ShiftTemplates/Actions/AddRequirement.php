<?php

namespace App\ShiftTemplates\Actions;

use App\ShiftTemplates\Models\ShiftTemplate;
use App\ShiftTemplates\Models\ShiftTemplateRequirement;

class AddRequirement
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(ShiftTemplate $template, array $data): ShiftTemplateRequirement
    {
        $requirement = new ShiftTemplateRequirement($data);
        $requirement->template()->associate($template);
        $requirement->save();

        return $requirement;
    }
}

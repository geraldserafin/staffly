<?php

namespace App\ShiftTemplates\Actions;

use App\ShiftTemplates\Models\ShiftTemplate;

class UpdateShiftTemplate
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(ShiftTemplate $template, array $data): ShiftTemplate
    {
        $template->update($data);

        return $template;
    }
}

<?php

namespace App\ShiftTemplates\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShiftTemplateRequirementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'shiftTemplateId' => $this->shift_template_id,
            'skillId' => $this->skill_id,
            'type' => $this->type,
            'count' => $this->count,
            'days' => $this->days,
        ];
    }
}

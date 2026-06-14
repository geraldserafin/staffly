<?php

namespace App\Scheduling\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShiftRequirementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'scheduledShiftId' => $this->scheduled_shift_id,
            'skillId' => $this->skill_id,
            'type' => $this->type,
            'count' => $this->count,
        ];
    }
}

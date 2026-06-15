<?php

namespace App\ShiftTemplates\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShiftTemplateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organizationId' => $this->organization_id,
            'teamId' => $this->team_id,
            'name' => $this->name,
            'startTime' => $this->start_time,
            'endTime' => $this->end_time,
            'restHoursAfter' => $this->rest_hours_after,
            'recurrenceFrequency' => $this->recurrence_frequency,
            'recurrenceDays' => $this->recurrence_days,
            'requirements' => ShiftTemplateRequirementResource::collection($this->whenLoaded('requirements')),
            'createdAt' => $this->created_at,
            'updatedAt' => $this->updated_at,
        ];
    }
}

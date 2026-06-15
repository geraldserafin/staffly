<?php

namespace App\Scheduling\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduledShiftResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'scheduleId' => $this->schedule_id,
            'shiftTemplateId' => $this->shift_template_id,
            'name' => $this->name,
            'startAt' => $this->start_at,
            'endAt' => $this->end_at,
            'restHoursAfter' => $this->rest_hours_after,
            'requirements' => ShiftRequirementResource::collection($this->whenLoaded('requirements')),
            'assignments' => ShiftAssignmentResource::collection($this->whenLoaded('assignments')),
        ];
    }
}

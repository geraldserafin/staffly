<?php

namespace App\Availability\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AvailabilityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'memberId' => $this->member_id,
            'kind' => $this->kind,
            'recurrence' => $this->recurrence,
            'days' => $this->days,
            'startTime' => $this->start_time,
            'endTime' => $this->end_time,
            'startAt' => $this->start_at,
            'endAt' => $this->end_at,
            'reason' => $this->reason,
            'createdAt' => $this->created_at,
            'updatedAt' => $this->updated_at,
        ];
    }
}

<?php

namespace App\Scheduling\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShiftAssignmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'scheduledShiftId' => $this->scheduled_shift_id,
            'memberId' => $this->member_id,
            'locked' => $this->locked,
        ];
    }
}

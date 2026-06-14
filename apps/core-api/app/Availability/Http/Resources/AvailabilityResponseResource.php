<?php

namespace App\Availability\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AvailabilityResponseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'availabilityRequestId' => $this->availability_request_id,
            'memberId' => $this->member_id,
            'status' => $this->status,
            'submittedAt' => $this->submitted_at,
        ];
    }
}

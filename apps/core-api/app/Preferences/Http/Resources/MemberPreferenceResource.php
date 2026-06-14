<?php

namespace App\Preferences\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemberPreferenceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'memberId' => $this->member_id,
            'type' => $this->type,
            'params' => $this->params,
            'weight' => $this->weight,
            'mode' => $this->mode,
            'hardApproved' => $this->hard_approved,
            'effectiveHard' => $this->isEffectiveHard(),
            'createdAt' => $this->created_at,
            'updatedAt' => $this->updated_at,
        ];
    }
}

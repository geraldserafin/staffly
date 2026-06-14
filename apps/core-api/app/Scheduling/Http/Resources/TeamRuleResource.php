<?php

namespace App\Scheduling\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamRuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'teamId' => $this->team_id,
            'minRestHours' => $this->min_rest_hours,
            'maxHoursPerWeek' => $this->max_hours_per_week,
            'maxConsecutiveDays' => $this->max_consecutive_days,
        ];
    }
}

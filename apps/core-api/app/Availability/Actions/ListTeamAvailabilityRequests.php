<?php

namespace App\Availability\Actions;

use App\Availability\Models\AvailabilityRequest;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Collection;

class ListTeamAvailabilityRequests
{
    /**
     * @return Collection<int, AvailabilityRequest>
     */
    public function handle(Team $team): Collection
    {
        return (new AvailabilityRequest)->newQuery()
            ->where('team_id', $team->getKey())
            ->get();
    }
}

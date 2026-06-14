<?php

namespace App\Availability\Actions;

use App\Availability\Models\AvailabilityRequest;
use App\Availability\Models\AvailabilityResponse;
use Illuminate\Database\Eloquent\Collection;

class ListRequestResponses
{
    /**
     * @return Collection<int, AvailabilityResponse>
     */
    public function handle(AvailabilityRequest $request): Collection
    {
        return $request->responses()->get();
    }
}

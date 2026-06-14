<?php

namespace App\Availability\Actions;

use App\Availability\Models\AvailabilityRequest;

class ShowAvailabilityRequest
{
    public function handle(AvailabilityRequest $request): AvailabilityRequest
    {
        return $request->load('responses');
    }
}

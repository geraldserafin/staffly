<?php

namespace App\Availability\Actions;

use App\Availability\Enums\RequestStatus;
use App\Availability\Models\AvailabilityRequest;

class CloseAvailabilityRequest
{
    public function handle(AvailabilityRequest $request): AvailabilityRequest
    {
        $request->status = RequestStatus::Closed;
        $request->save();

        return $request;
    }
}

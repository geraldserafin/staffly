<?php

namespace App\Availability\Actions;

use App\Availability\Enums\ResponseStatus;
use App\Availability\Models\AvailabilityRequest;
use App\Availability\Models\AvailabilityResponse;
use App\Members\Models\Member;

class SubmitAvailabilityResponse
{
    public function handle(AvailabilityRequest $request, Member $member): AvailabilityResponse
    {
        /** @var AvailabilityResponse $response */
        $response = $request->responses()
            ->where('member_id', $member->getKey())
            ->firstOrFail();

        $response->status = ResponseStatus::Submitted;
        $response->submitted_at = now();
        $response->save();

        return $response;
    }
}

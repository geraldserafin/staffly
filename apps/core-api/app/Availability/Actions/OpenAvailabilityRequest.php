<?php

namespace App\Availability\Actions;

use App\Availability\Enums\RequestStatus;
use App\Availability\Enums\ResponseStatus;
use App\Availability\Models\AvailabilityRequest;
use App\Availability\Models\AvailabilityResponse;
use App\Teams\Models\Team;
use Illuminate\Support\Facades\DB;

class OpenAvailabilityRequest
{
    /**
     * Open a request and seed a pending response for every current team member.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(Team $team, array $data): AvailabilityRequest
    {
        return DB::transaction(function () use ($team, $data): AvailabilityRequest {
            $request = new AvailabilityRequest($data);
            $request->status = RequestStatus::Open;
            $request->team()->associate($team);
            $request->save();

            foreach ($team->members()->get() as $member) {
                $response = new AvailabilityResponse(['status' => ResponseStatus::Pending]);
                $response->member()->associate($member);
                $request->responses()->save($response);
            }

            return $request;
        });
    }
}

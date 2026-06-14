<?php

namespace App\Availability\Http\Controllers;

use App\Availability\Actions\CloseAvailabilityRequest;
use App\Availability\Actions\ListRequestResponses;
use App\Availability\Actions\ListTeamAvailabilityRequests;
use App\Availability\Actions\OpenAvailabilityRequest;
use App\Availability\Actions\ShowAvailabilityRequest;
use App\Availability\Actions\SubmitAvailabilityResponse;
use App\Availability\Http\Requests\StoreAvailabilityRequestRequest;
use App\Availability\Http\Resources\AvailabilityRequestResource;
use App\Availability\Http\Resources\AvailabilityResponseResource;
use App\Availability\Models\AvailabilityRequest;
use App\Members\Models\Member;
use App\Teams\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AvailabilityRequestController
{
    public function index(Team $team, ListTeamAvailabilityRequests $action): AnonymousResourceCollection
    {
        return AvailabilityRequestResource::collection($action->handle($team));
    }

    public function store(StoreAvailabilityRequestRequest $request, Team $team, OpenAvailabilityRequest $action): JsonResponse
    {
        $availabilityRequest = $action->handle($team, $request->validated());

        return AvailabilityRequestResource::make($availabilityRequest->load('responses'))
            ->response()
            ->setStatusCode(JsonResponse::HTTP_CREATED);
    }

    public function show(AvailabilityRequest $availabilityRequest, ShowAvailabilityRequest $action): AvailabilityRequestResource
    {
        return AvailabilityRequestResource::make($action->handle($availabilityRequest));
    }

    public function close(AvailabilityRequest $availabilityRequest, CloseAvailabilityRequest $action): AvailabilityRequestResource
    {
        return AvailabilityRequestResource::make($action->handle($availabilityRequest));
    }

    public function responses(AvailabilityRequest $availabilityRequest, ListRequestResponses $action): AnonymousResourceCollection
    {
        return AvailabilityResponseResource::collection($action->handle($availabilityRequest));
    }

    public function submit(AvailabilityRequest $availabilityRequest, Member $member, SubmitAvailabilityResponse $action): AvailabilityResponseResource
    {
        return AvailabilityResponseResource::make($action->handle($availabilityRequest, $member));
    }
}

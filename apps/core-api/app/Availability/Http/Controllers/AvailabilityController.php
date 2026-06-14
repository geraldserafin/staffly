<?php

namespace App\Availability\Http\Controllers;

use App\Availability\Actions\CreateAvailability;
use App\Availability\Actions\DeleteAvailability;
use App\Availability\Actions\ListMemberAvailabilities;
use App\Availability\Http\Requests\StoreAvailabilityRequest;
use App\Availability\Http\Resources\AvailabilityResource;
use App\Availability\Models\Availability;
use App\Members\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class AvailabilityController
{
    public function index(Member $member, ListMemberAvailabilities $action): AnonymousResourceCollection
    {
        return AvailabilityResource::collection($action->handle($member));
    }

    public function store(StoreAvailabilityRequest $request, Member $member, CreateAvailability $action): JsonResponse
    {
        $availability = $action->handle($member, $request->validated());

        return AvailabilityResource::make($availability)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(Availability $availability, DeleteAvailability $action): Response
    {
        $action->handle($availability);

        return response()->noContent();
    }
}

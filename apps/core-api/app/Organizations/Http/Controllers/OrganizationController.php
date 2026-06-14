<?php

namespace App\Organizations\Http\Controllers;

use App\Organizations\Actions\CreateOrganization;
use App\Organizations\Actions\DeleteOrganization;
use App\Organizations\Actions\ShowOrganization;
use App\Organizations\Actions\UpdateOrganization;
use App\Organizations\Http\Requests\StoreOrganizationRequest;
use App\Organizations\Http\Requests\UpdateOrganizationRequest;
use App\Organizations\Http\Resources\OrganizationResource;
use App\Organizations\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class OrganizationController
{
    public function store(StoreOrganizationRequest $request, CreateOrganization $action): JsonResponse
    {
        $organization = $action->handle($request->validated());

        return OrganizationResource::make($organization)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Organization $organization, ShowOrganization $action): OrganizationResource
    {
        return OrganizationResource::make($action->handle($organization));
    }

    public function update(UpdateOrganizationRequest $request, Organization $organization, UpdateOrganization $action): OrganizationResource
    {
        return OrganizationResource::make($action->handle($organization, $request->validated()));
    }

    public function destroy(Organization $organization, DeleteOrganization $action): Response
    {
        $action->handle($organization);

        return response()->noContent();
    }
}

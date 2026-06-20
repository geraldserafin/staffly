<?php

namespace App\Organizations\Http\Controllers;

use App\Auth\Actions\AssignRole;
use App\Auth\Models\User;
use App\Members\Models\Member;
use App\Organizations\Actions\CreateOrganization;
use App\Organizations\Actions\DeleteOrganization;
use App\Organizations\Actions\ListOrganizations;
use App\Organizations\Actions\ShowOrganization;
use App\Organizations\Actions\UpdateOrganization;
use App\Organizations\Http\Requests\StoreOrganizationRequest;
use App\Organizations\Http\Requests\UpdateOrganizationRequest;
use App\Organizations\Http\Resources\OrganizationResource;
use App\Organizations\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class OrganizationController
{
    public function __construct(
        private readonly AssignRole $assignRole,
    ) {}

    public function index(Request $request, ListOrganizations $action): AnonymousResourceCollection
    {
        return OrganizationResource::collection($action->handle($request->user()));
    }

    public function store(StoreOrganizationRequest $request, CreateOrganization $action): JsonResponse
    {
        $organization = $action->handle($request->validated());

        /** @var User $user */
        $user = $request->user();

        Member::create([
            'name' => $user->name,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => 'owner',
            'invitation_accepted_at' => now(),
        ]);

        $this->assignRole->handle($user, $organization->id, 'owner');

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

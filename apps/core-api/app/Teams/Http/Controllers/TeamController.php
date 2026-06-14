<?php

namespace App\Teams\Http\Controllers;

use App\Members\Http\Resources\MemberResource;
use App\Members\Models\Member;
use App\Organizations\Models\Organization;
use App\Teams\Actions\AttachMemberToTeam;
use App\Teams\Actions\CreateTeam;
use App\Teams\Actions\DeleteTeam;
use App\Teams\Actions\DetachMemberFromTeam;
use App\Teams\Actions\ListOrganizationTeams;
use App\Teams\Actions\ListTeamMembers;
use App\Teams\Actions\ShowTeam;
use App\Teams\Actions\UpdateTeam;
use App\Teams\Http\Requests\StoreTeamRequest;
use App\Teams\Http\Requests\UpdateTeamRequest;
use App\Teams\Http\Resources\TeamResource;
use App\Teams\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TeamController
{
    public function index(Organization $organization, ListOrganizationTeams $action): AnonymousResourceCollection
    {
        return TeamResource::collection($action->handle($organization));
    }

    public function store(StoreTeamRequest $request, Organization $organization, CreateTeam $action): JsonResponse
    {
        $team = $action->handle($organization, $request->validated());

        return TeamResource::make($team)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Team $team, ShowTeam $action): TeamResource
    {
        return TeamResource::make($action->handle($team));
    }

    public function update(UpdateTeamRequest $request, Team $team, UpdateTeam $action): TeamResource
    {
        return TeamResource::make($action->handle($team, $request->validated()));
    }

    public function destroy(Team $team, DeleteTeam $action): Response
    {
        $action->handle($team);

        return response()->noContent();
    }

    public function members(Team $team, ListTeamMembers $action): AnonymousResourceCollection
    {
        return MemberResource::collection($action->handle($team));
    }

    public function attachMember(Team $team, Member $member, AttachMemberToTeam $action): Response
    {
        // A member can only join a team within its own organization.
        abort_unless(
            $member->organization_id === $team->organization_id,
            Response::HTTP_UNPROCESSABLE_ENTITY,
            'Member belongs to a different organization.'
        );

        $action->handle($team, $member);

        return response()->noContent();
    }

    public function detachMember(Team $team, Member $member, DetachMemberFromTeam $action): Response
    {
        $action->handle($team, $member);

        return response()->noContent();
    }
}

<?php

namespace App\Members\Http\Controllers;

use App\Auth\Actions\CreateInvitation;
use App\Members\Actions\CreateMember;
use App\Members\Actions\DeleteMember;
use App\Members\Actions\ListMemberShifts;
use App\Members\Actions\ListOrganizationMembers;
use App\Members\Actions\ShowMember;
use App\Members\Actions\UpdateMember;
use App\Members\Http\Requests\StoreMemberRequest;
use App\Members\Http\Requests\UpdateMemberRequest;
use App\Members\Http\Resources\MemberResource;
use App\Members\Models\Member;
use App\Organizations\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class MemberController
{
    public function index(Organization $organization, ListOrganizationMembers $action): AnonymousResourceCollection
    {
        return MemberResource::collection($action->handle($organization));
    }

    public function store(StoreMemberRequest $request, Organization $organization, CreateMember $createMember, CreateInvitation $createInvitation): JsonResponse
    {
        $data = $request->validated();
        $teamIds = $data['teamIds'] ?? [];

        $member = $createMember->handle($organization, $data);

        if ($teamIds !== []) {
            $member->teams()->sync($teamIds);
        }

        $createInvitation->handle($organization, $member, $request->input('email'));

        $member->refresh()->load('teams');

        return MemberResource::make($member)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Member $member, ShowMember $action): MemberResource
    {
        return MemberResource::make($action->handle($member));
    }

    public function shifts(Member $member, ListMemberShifts $action): JsonResponse
    {
        return response()->json($action->handle($member));
    }

    public function update(UpdateMemberRequest $request, Member $member, UpdateMember $action): MemberResource
    {
        return MemberResource::make($action->handle($member, $request->validated()));
    }

    public function destroy(Member $member, DeleteMember $action): Response
    {
        $action->handle($member);

        return response()->noContent();
    }
}

<?php

namespace App\Members\Http\Controllers;

use App\Members\Actions\CreateMember;
use App\Members\Actions\DeleteMember;
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

    public function store(StoreMemberRequest $request, Organization $organization, CreateMember $action): JsonResponse
    {
        $member = $action->handle($organization, $request->validated());

        return MemberResource::make($member)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Member $member, ShowMember $action): MemberResource
    {
        return MemberResource::make($action->handle($member));
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

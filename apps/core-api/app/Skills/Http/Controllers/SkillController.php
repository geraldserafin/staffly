<?php

namespace App\Skills\Http\Controllers;

use App\Members\Models\Member;
use App\Organizations\Models\Organization;
use App\Skills\Actions\AssignSkillToMember;
use App\Skills\Actions\CreateSkill;
use App\Skills\Actions\DeleteSkill;
use App\Skills\Actions\ListMemberSkills;
use App\Skills\Actions\ListOrganizationSkills;
use App\Skills\Actions\RemoveSkillFromMember;
use App\Skills\Actions\ShowSkill;
use App\Skills\Actions\UpdateSkill;
use App\Skills\Http\Requests\StoreSkillRequest;
use App\Skills\Http\Requests\UpdateSkillRequest;
use App\Skills\Http\Resources\SkillResource;
use App\Skills\Models\Skill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class SkillController
{
    public function index(Organization $organization, ListOrganizationSkills $action): AnonymousResourceCollection
    {
        return SkillResource::collection($action->handle($organization));
    }

    public function store(StoreSkillRequest $request, Organization $organization, CreateSkill $action): JsonResponse
    {
        $skill = $action->handle($organization, $request->validated());

        return SkillResource::make($skill)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Skill $skill, ShowSkill $action): SkillResource
    {
        return SkillResource::make($action->handle($skill));
    }

    public function update(UpdateSkillRequest $request, Skill $skill, UpdateSkill $action): SkillResource
    {
        return SkillResource::make($action->handle($skill, $request->validated()));
    }

    public function destroy(Skill $skill, DeleteSkill $action): Response
    {
        $action->handle($skill);

        return response()->noContent();
    }

    public function memberSkills(Member $member, ListMemberSkills $action): AnonymousResourceCollection
    {
        return SkillResource::collection($action->handle($member));
    }

    public function assignToMember(Member $member, Skill $skill, AssignSkillToMember $action): Response
    {
        // A skill can only be assigned to a member in the same organization.
        abort_unless(
            $skill->organization_id === $member->organization_id,
            Response::HTTP_UNPROCESSABLE_ENTITY,
            'Skill belongs to a different organization.'
        );

        $action->handle($skill, $member);

        return response()->noContent();
    }

    public function removeFromMember(Member $member, Skill $skill, RemoveSkillFromMember $action): Response
    {
        $action->handle($skill, $member);

        return response()->noContent();
    }
}

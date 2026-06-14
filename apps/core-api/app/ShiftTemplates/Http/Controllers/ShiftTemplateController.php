<?php

namespace App\ShiftTemplates\Http\Controllers;

use App\Organizations\Models\Organization;
use App\ShiftTemplates\Actions\AddRequirement;
use App\ShiftTemplates\Actions\CreateShiftTemplate;
use App\ShiftTemplates\Actions\DeleteShiftTemplate;
use App\ShiftTemplates\Actions\ListOrganizationShiftTemplates;
use App\ShiftTemplates\Actions\RemoveRequirement;
use App\ShiftTemplates\Actions\ShowShiftTemplate;
use App\ShiftTemplates\Actions\UpdateShiftTemplate;
use App\ShiftTemplates\Http\Requests\StoreRequirementRequest;
use App\ShiftTemplates\Http\Requests\StoreShiftTemplateRequest;
use App\ShiftTemplates\Http\Requests\UpdateShiftTemplateRequest;
use App\ShiftTemplates\Http\Resources\ShiftTemplateRequirementResource;
use App\ShiftTemplates\Http\Resources\ShiftTemplateResource;
use App\ShiftTemplates\Models\ShiftTemplate;
use App\ShiftTemplates\Models\ShiftTemplateRequirement;
use App\Teams\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ShiftTemplateController
{
    public function index(Organization $organization, ListOrganizationShiftTemplates $action): AnonymousResourceCollection
    {
        return ShiftTemplateResource::collection($action->handle($organization));
    }

    public function store(StoreShiftTemplateRequest $request, Organization $organization, CreateShiftTemplate $action): JsonResponse
    {
        $data = $request->validated();
        $team = isset($data['team_id'])
            ? (new Team)->newQuery()->find($data['team_id'])
            : null;

        $template = $action->handle($organization, $team, $data);

        return ShiftTemplateResource::make($template)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(ShiftTemplate $shiftTemplate, ShowShiftTemplate $action): ShiftTemplateResource
    {
        return ShiftTemplateResource::make($action->handle($shiftTemplate));
    }

    public function update(UpdateShiftTemplateRequest $request, ShiftTemplate $shiftTemplate, UpdateShiftTemplate $action): ShiftTemplateResource
    {
        return ShiftTemplateResource::make($action->handle($shiftTemplate, $request->validated()));
    }

    public function destroy(ShiftTemplate $shiftTemplate, DeleteShiftTemplate $action): Response
    {
        $action->handle($shiftTemplate);

        return response()->noContent();
    }

    public function addRequirement(StoreRequirementRequest $request, ShiftTemplate $shiftTemplate, AddRequirement $action): JsonResponse
    {
        $requirement = $action->handle($shiftTemplate, $request->validated());

        return ShiftTemplateRequirementResource::make($requirement)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function removeRequirement(ShiftTemplateRequirement $requirement, RemoveRequirement $action): Response
    {
        $action->handle($requirement);

        return response()->noContent();
    }
}

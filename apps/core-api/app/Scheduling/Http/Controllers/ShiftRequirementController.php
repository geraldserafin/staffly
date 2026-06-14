<?php

namespace App\Scheduling\Http\Controllers;

use App\Scheduling\Actions\AddShiftRequirement;
use App\Scheduling\Actions\RemoveShiftRequirement;
use App\Scheduling\Actions\UpdateShiftRequirement;
use App\Scheduling\Http\Requests\StoreShiftRequirementRequest;
use App\Scheduling\Http\Requests\UpdateShiftRequirementRequest;
use App\Scheduling\Http\Resources\ShiftRequirementResource;
use App\Scheduling\Models\ScheduledShift;
use App\Scheduling\Models\ShiftRequirement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ShiftRequirementController
{
    public function store(StoreShiftRequirementRequest $request, ScheduledShift $scheduledShift, AddShiftRequirement $action): JsonResponse
    {
        $requirement = $action->handle($scheduledShift, $request->validated());

        return ShiftRequirementResource::make($requirement)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateShiftRequirementRequest $request, ShiftRequirement $shiftRequirement, UpdateShiftRequirement $action): ShiftRequirementResource
    {
        return ShiftRequirementResource::make($action->handle($shiftRequirement, $request->validated()));
    }

    public function destroy(ShiftRequirement $shiftRequirement, RemoveShiftRequirement $action): Response
    {
        $action->handle($shiftRequirement);

        return response()->noContent();
    }
}

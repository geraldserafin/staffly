<?php

namespace App\Scheduling\Http\Controllers;

use App\Members\Models\Member;
use App\Scheduling\Actions\AssignMember;
use App\Scheduling\Actions\CreateShift;
use App\Scheduling\Actions\DeleteShift;
use App\Scheduling\Actions\ListScheduleShifts;
use App\Scheduling\Actions\ListShiftAssignments;
use App\Scheduling\Actions\UnassignMember;
use App\Scheduling\Http\Requests\StoreAssignmentRequest;
use App\Scheduling\Http\Requests\StoreShiftRequest;
use App\Scheduling\Http\Resources\ScheduledShiftResource;
use App\Scheduling\Http\Resources\ShiftAssignmentResource;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ScheduledShiftController
{
    public function index(Schedule $schedule, ListScheduleShifts $action): AnonymousResourceCollection
    {
        return ScheduledShiftResource::collection($action->handle($schedule));
    }

    public function store(StoreShiftRequest $request, Schedule $schedule, CreateShift $action): JsonResponse
    {
        $shift = $action->handle($schedule, $request->validated());

        return ScheduledShiftResource::make($shift)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(ScheduledShift $scheduledShift, DeleteShift $action): Response
    {
        $action->handle($scheduledShift);

        return response()->noContent();
    }

    public function assignments(ScheduledShift $scheduledShift, ListShiftAssignments $action): AnonymousResourceCollection
    {
        return ShiftAssignmentResource::collection($action->handle($scheduledShift));
    }

    public function assign(StoreAssignmentRequest $request, ScheduledShift $scheduledShift, AssignMember $action): JsonResponse
    {
        $data = $request->validated();
        $member = (new Member)->newQuery()->findOrFail($data['memberId']);

        $assignment = $action->handle($scheduledShift, $member, [
            'locked' => $data['locked'] ?? false,
        ]);

        return ShiftAssignmentResource::make($assignment)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function unassign(ScheduledShift $scheduledShift, Member $member, UnassignMember $action): Response
    {
        $action->handle($scheduledShift, $member);

        return response()->noContent();
    }
}

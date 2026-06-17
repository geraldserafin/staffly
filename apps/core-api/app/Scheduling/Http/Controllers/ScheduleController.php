<?php

namespace App\Scheduling\Http\Controllers;

use App\Scheduling\Actions\ArchiveSchedule;
use App\Scheduling\Actions\CreateSchedule;
use App\Scheduling\Actions\DeleteSchedule;
use App\Scheduling\Actions\GenerateScheduleShifts;
use App\Scheduling\Actions\ListTeamSchedules;
use App\Scheduling\Actions\PublishSchedule;
use App\Scheduling\Actions\ShowSchedule;
use App\Scheduling\Actions\UpdateSchedule;
use App\Scheduling\Http\Requests\StoreScheduleRequest;
use App\Scheduling\Http\Requests\UpdateScheduleRequest;
use App\Scheduling\Http\Resources\ScheduleResource;
use App\Scheduling\Models\Schedule;
use App\Teams\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ScheduleController
{
    public function index(Team $team, ListTeamSchedules $action): AnonymousResourceCollection
    {
        return ScheduleResource::collection($action->handle($team));
    }

    public function store(StoreScheduleRequest $request, Team $team, CreateSchedule $create, GenerateScheduleShifts $generate): JsonResponse
    {
        $schedule = $create->handle($team, $request->validated());
        $generate->handle($schedule);

        $schedule->load(['shifts.requirements', 'shifts.assignments']);

        return ScheduleResource::make($schedule)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Re-run template expansion (e.g. after templates were added or attached to
     * the team). Regenerates template-originated shifts; manual shifts survive.
     */
    public function regenerate(Schedule $schedule, GenerateScheduleShifts $generate): ScheduleResource
    {
        $generate->handle($schedule);

        return ScheduleResource::make($schedule->load(['shifts.requirements', 'shifts.assignments']));
    }

    public function show(Schedule $schedule, ShowSchedule $action): ScheduleResource
    {
        return ScheduleResource::make($action->handle($schedule));
    }

    public function update(UpdateScheduleRequest $request, Schedule $schedule, UpdateSchedule $action): ScheduleResource
    {
        return ScheduleResource::make($action->handle($schedule, $request->validated()));
    }

    public function destroy(Schedule $schedule, DeleteSchedule $action): Response
    {
        $action->handle($schedule);

        return response()->noContent();
    }

    public function publish(Schedule $schedule, PublishSchedule $action): ScheduleResource
    {
        return ScheduleResource::make($action->handle($schedule));
    }

    public function archive(Schedule $schedule, ArchiveSchedule $action): ScheduleResource
    {
        return ScheduleResource::make($action->handle($schedule));
    }
}

<?php

namespace App\Auth\Middleware;

use App\Members\Models\Member;
use App\Scheduling\Models\Schedule;
use App\Scheduling\Models\ScheduledShift;
use App\Teams\Models\Team;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetPermissionTeam
{
    /**
     * Resolve the organisation ID from the current route and set it as
     * the spatie permission team scope so all permission checks are
     * scoped to the correct organisation.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $orgId = $this->resolveOrgId($request);

        if ($orgId) {
            setPermissionsTeamId($orgId);
        }

        return $next($request);
    }

    private function resolveOrgId(Request $request): ?string
    {
        $organization = $request->route('organization');

        if ($organization) {
            return is_object($organization) ? $organization->id : $organization;
        }

        // Models with a direct organization_id column.
        foreach (['member', 'team', 'skill', 'shiftTemplate'] as $param) {
            if ($model = $request->route($param) and isset($model->organization_id)) {
                return $model->organization_id;
            }
        }

        // Models that resolve through member_id.
        foreach (['availability', 'preference'] as $param) {
            if ($model = $request->route($param) and isset($model->member_id)) {
                return Member::where('id', $model->member_id)->value('organization_id');
            }
        }

        // Models that resolve through team_id.
        foreach (['schedule', 'availabilityRequest'] as $param) {
            if ($model = $request->route($param) and isset($model->team_id)) {
                return Team::where('id', $model->team_id)->value('organization_id');
            }
        }

        // Models that resolve through schedule_id → team_id.
        foreach (['scheduledShift', 'solveRun'] as $param) {
            if ($model = $request->route($param) and isset($model->schedule_id)) {
                $teamId = Schedule::where('id', $model->schedule_id)->value('team_id');

                if ($teamId) {
                    return Team::where('id', $teamId)->value('organization_id');
                }
            }
        }

        // Models that resolve through scheduled_shift_id → schedule_id → team_id.
        foreach (['shiftRequirement', 'shiftAssignment'] as $param) {
            if ($model = $request->route($param) and isset($model->scheduled_shift_id)) {
                $scheduleId = ScheduledShift::where('id', $model->scheduled_shift_id)->value('schedule_id');

                if ($scheduleId) {
                    $teamId = Schedule::where('id', $scheduleId)->value('team_id');

                    if ($teamId) {
                        return Team::where('id', $teamId)->value('organization_id');
                    }
                }
            }
        }

        return null;
    }
}

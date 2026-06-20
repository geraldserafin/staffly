import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';
import {
  Insights,
  PreviewResult,
  RequirementType,
  Schedule,
  ScheduledShift,
  ShiftAssignment,
  ShiftRequirement,
  SolveRun,
  TeamRule,
} from '../../core/models';

export interface ScheduleInput {
  name: string;
  start_date: string;
  end_date: string;
  weights?: Record<string, unknown> | null;
}

export interface ShiftInput {
  name: string;
  start_at: string;
  end_at: string;
  rest_hours_after?: number | null;
}

export interface ShiftRequirementInput {
  type: RequirementType;
  skill_id?: string | null;
  count?: number | null;
}

@Injectable({ providedIn: 'root' })
export class SchedulingService {
  private readonly api = inject(Api);

  // Schedules
  listByTeam(teamId: string): Observable<Schedule[]> {
    return this.api.list<Schedule>(`teams/${teamId}/schedules`);
  }

  get(id: string): Observable<Schedule> {
    return this.api.get<Schedule>(`schedules/${id}`);
  }

  create(teamId: string, body: ScheduleInput): Observable<Schedule> {
    return this.api.post<Schedule>(`teams/${teamId}/schedules`, body);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`schedules/${id}`);
  }

  /** Re-run template expansion into an existing schedule (after templates change). */
  regenerate(id: string): Observable<Schedule> {
    return this.api.post<Schedule>(`schedules/${id}/shifts/generate`);
  }

  publish(id: string): Observable<Schedule> {
    return this.api.post<Schedule>(`schedules/${id}/publish`);
  }

  archive(id: string): Observable<Schedule> {
    return this.api.post<Schedule>(`schedules/${id}/archive`);
  }

  // Shifts
  shifts(scheduleId: string): Observable<ScheduledShift[]> {
    return this.api.list<ScheduledShift>(`schedules/${scheduleId}/shifts`);
  }

  addShift(scheduleId: string, body: ShiftInput): Observable<ScheduledShift> {
    return this.api.post<ScheduledShift>(`schedules/${scheduleId}/shifts`, body);
  }

  deleteShift(shiftId: string): Observable<void> {
    return this.api.delete(`scheduled-shifts/${shiftId}`);
  }

  // Per-shift requirements
  addRequirement(shiftId: string, body: ShiftRequirementInput): Observable<ShiftRequirement> {
    return this.api.post<ShiftRequirement>(`scheduled-shifts/${shiftId}/requirements`, body);
  }

  deleteRequirement(requirementId: string): Observable<void> {
    return this.api.delete(`shift-requirements/${requirementId}`);
  }

  // Assignments
  assignments(shiftId: string): Observable<ShiftAssignment[]> {
    return this.api.list<ShiftAssignment>(`scheduled-shifts/${shiftId}/assignments`);
  }

  assign(shiftId: string, memberId: string, locked = false): Observable<ShiftAssignment> {
    return this.api.post<ShiftAssignment>(`scheduled-shifts/${shiftId}/assignments`, {
      memberId,
      locked,
    });
  }

  unassign(shiftId: string, memberId: string): Observable<void> {
    return this.api.delete(`scheduled-shifts/${shiftId}/assignments/${memberId}`);
  }

  setLock(assignmentId: string, locked: boolean): Observable<ShiftAssignment> {
    return this.api.patch<ShiftAssignment>(`shift-assignments/${assignmentId}`, { locked });
  }

  // Solve / preview / runs / insights
  solve(scheduleId: string): Observable<SolveRun> {
    return this.api.post<SolveRun>(`schedules/${scheduleId}/solve`);
  }

  preview(scheduleId: string, lambda?: number): Observable<PreviewResult> {
    return this.api.postRaw<PreviewResult>(
      `schedules/${scheduleId}/solve/preview`,
      lambda === undefined ? {} : { lambda },
    );
  }

  runs(scheduleId: string): Observable<SolveRun[]> {
    return this.api.list<SolveRun>(`schedules/${scheduleId}/solve-runs`);
  }

  run(id: string): Observable<SolveRun> {
    return this.api.get<SolveRun>(`solve-runs/${id}`);
  }

  applyRun(id: string): Observable<SolveRun> {
    return this.api.post<SolveRun>(`solve-runs/${id}/apply`);
  }

  insights(scheduleId: string): Observable<Insights> {
    return this.api.getRaw<Insights>(`schedules/${scheduleId}/insights`);
  }

  // Team rules
  rules(teamId: string): Observable<TeamRule> {
    return this.api.get<TeamRule>(`teams/${teamId}/rules`);
  }

  updateRules(
    teamId: string,
    body: {
      min_rest_hours?: number | null;
      max_hours_per_week?: number | null;
      max_consecutive_days?: number | null;
    },
  ): Observable<TeamRule> {
    return this.api.put<TeamRule>(`teams/${teamId}/rules`, body);
  }
}

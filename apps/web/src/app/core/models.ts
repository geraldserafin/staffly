// TypeScript mirrors of the core-api JSON resources (camelCase keys as emitted).

export type PayrollPeriod = 'week' | 'biweekly' | 'month';
export type ScheduleStatus = 'draft' | 'published' | 'archived';
export type SolveStatus = 'pending' | 'running' | 'succeeded' | 'failed';
export type RequirementType = 'headcount' | 'coverage';
export type RecurrenceFrequency = 'weekly' | 'monthly';
export type PreferenceMode = 'soft' | 'hard';
export type PreferenceType =
  | 'preferred_shift_type'
  | 'hours_target'
  | 'weekend'
  | 'max_consecutive_days'
  | 'avoid_fast_rotation'
  | 'preferred_days_off';
export type AvailabilityKind = 'available' | 'unavailable';

export interface Organization {
  id: string;
  name: string;
  payrollPeriod: PayrollPeriod;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  organizationId: string;
  name: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftTemplateRequirement {
  id: string;
  shiftTemplateId: string;
  skillId: string | null;
  type: RequirementType;
  count: number | null;
  days: number[] | null;
}

export interface ShiftTemplate {
  id: string;
  organizationId: string;
  teamIds?: string[]; // empty/absent = applies to all the org's teams
  name: string;
  category: string | null;
  startTime: string;
  endTime: string;
  restHoursAfter: number | null;
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceDays: number[] | null;
  requirements?: ShiftTemplateRequirement[];
  createdAt: string;
  updatedAt: string;
}

export interface ShiftRequirement {
  id: string;
  scheduledShiftId: string;
  skillId: string | null;
  type: RequirementType;
  count: number | null;
}

export interface ShiftAssignment {
  id: string;
  scheduledShiftId: string;
  memberId: string;
  locked: boolean;
}

export interface ScheduledShift {
  id: string;
  scheduleId: string;
  shiftTemplateId: string | null;
  name: string;
  category: string | null;
  startAt: string;
  endAt: string;
  restHoursAfter: number | null;
  requirements?: ShiftRequirement[];
  assignments?: ShiftAssignment[];
}

export interface Schedule {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  weights: Record<string, unknown> | null;
  shifts?: ScheduledShift[];
  createdAt: string;
  updatedAt: string;
}

export interface SolveRun {
  id: string;
  scheduleId: string;
  status: SolveStatus;
  diagnostics: Record<string, unknown> | null;
  resultSnapshot: { shiftId: string; memberId: string }[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamRule {
  teamId: string;
  minRestHours: number | null;
  maxHoursPerWeek: number | null;
  maxConsecutiveDays: number | null;
}

export interface Availability {
  id: string;
  memberId: string;
  kind: AvailabilityKind;
  recurrence: 'weekly' | null;
  days: number[] | null;
  startTime: string | null;
  endTime: string | null;
  startAt: string | null;
  endAt: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberPreference {
  id: string;
  memberId: string;
  type: PreferenceType;
  params: Record<string, unknown> | null;
  weight: number;
  mode: PreferenceMode;
  hardApproved: boolean;
  effectiveHard: boolean;
  createdAt: string;
  updatedAt: string;
}

// Un-enveloped solver/report payloads.
export interface PreviewResult {
  assignments: { shiftId: string; memberId: string }[];
  diagnostics: Record<string, unknown>;
}

export interface Insights {
  members: {
    memberId: string;
    name: string;
    assignedShifts: number;
    hours: number;
    dissatisfaction: number | null;
  }[];
  staffingGaps: Record<string, unknown>[];
  fairness: {
    members: number;
    totalDissatisfaction: number;
    maxDissatisfaction: number;
    fromLastSolve: boolean;
  };
}

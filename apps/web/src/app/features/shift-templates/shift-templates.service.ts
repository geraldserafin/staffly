import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';
import { RequirementType, ShiftTemplate } from '../../core/models';

export interface ShiftTemplateInput {
  name: string;
  category?: string | null;
  start_time: string; // H:i
  end_time: string;
  rest_hours_after?: number | null;
  team_ids?: string[] | null; // empty/absent = all teams
  recurrence_frequency?: 'weekly' | 'monthly' | null;
  recurrence_days?: number[] | null;
}

export interface RequirementInput {
  type: RequirementType;
  skill_id?: string | null;
  count?: number | null;
  days?: number[] | null;
}

@Injectable({ providedIn: 'root' })
export class ShiftTemplatesService {
  private readonly api = inject(Api);

  listByOrg(orgId: string): Observable<ShiftTemplate[]> {
    return this.api.list<ShiftTemplate>(`organizations/${orgId}/shift-templates`);
  }

  get(id: string): Observable<ShiftTemplate> {
    return this.api.get<ShiftTemplate>(`shift-templates/${id}`);
  }

  create(orgId: string, body: ShiftTemplateInput): Observable<ShiftTemplate> {
    return this.api.post<ShiftTemplate>(`organizations/${orgId}/shift-templates`, body);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`shift-templates/${id}`);
  }

  addRequirement(templateId: string, body: RequirementInput): Observable<unknown> {
    return this.api.post(`shift-templates/${templateId}/requirements`, body);
  }

  removeRequirement(requirementId: string): Observable<void> {
    return this.api.delete(`shift-template-requirements/${requirementId}`);
  }

  // Team scoping
  byTeam(teamId: string): Observable<ShiftTemplate[]> {
    return this.api.list<ShiftTemplate>(`teams/${teamId}/shift-templates`);
  }

  attachToTeam(teamId: string, templateId: string): Observable<ShiftTemplate> {
    return this.api.put<ShiftTemplate>(`teams/${teamId}/shift-templates/${templateId}`, {});
  }

  detachFromTeam(teamId: string, templateId: string): Observable<void> {
    return this.api.delete(`teams/${teamId}/shift-templates/${templateId}`);
  }
}

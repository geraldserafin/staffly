import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';
import { Skill } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly api = inject(Api);

  listByOrg(orgId: string): Observable<Skill[]> {
    return this.api.list<Skill>(`organizations/${orgId}/skills`);
  }

  create(orgId: string, body: { name: string }): Observable<Skill> {
    return this.api.post<Skill>(`organizations/${orgId}/skills`, body);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`skills/${id}`);
  }

  memberSkills(memberId: string): Observable<Skill[]> {
    return this.api.list<Skill>(`members/${memberId}/skills`);
  }

  assignToMember(memberId: string, skillId: string): Observable<unknown> {
    return this.api.put(`members/${memberId}/skills/${skillId}`, {});
  }

  removeFromMember(memberId: string, skillId: string): Observable<void> {
    return this.api.delete(`members/${memberId}/skills/${skillId}`);
  }
}

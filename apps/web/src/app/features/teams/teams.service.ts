import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';
import { Member, Team } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly api = inject(Api);

  listByOrg(orgId: string): Observable<Team[]> {
    return this.api.list<Team>(`organizations/${orgId}/teams`);
  }

  get(id: string): Observable<Team> {
    return this.api.get<Team>(`teams/${id}`);
  }

  create(orgId: string, body: { name: string }): Observable<Team> {
    return this.api.post<Team>(`organizations/${orgId}/teams`, body);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`teams/${id}`);
  }

  members(teamId: string): Observable<Member[]> {
    return this.api.list<Member>(`teams/${teamId}/members`);
  }

  attachMember(teamId: string, memberId: string): Observable<unknown> {
    return this.api.put(`teams/${teamId}/members/${memberId}`, {});
  }

  detachMember(teamId: string, memberId: string): Observable<void> {
    return this.api.delete(`teams/${teamId}/members/${memberId}`);
  }
}

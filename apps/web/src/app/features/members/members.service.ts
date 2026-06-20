import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';
import { Member, MemberRole, MemberShift } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly api = inject(Api);

  listByOrg(orgId: string): Observable<Member[]> {
    return this.api.list<Member>(`organizations/${orgId}/members`);
  }

  get(id: string): Observable<Member> {
    return this.api.get<Member>(`members/${id}`);
  }

  shifts(id: string): Observable<MemberShift[]> {
    // Endpoint returns a bare JSON array (no `{ data }` envelope), so use getRaw.
    return this.api.getRaw<MemberShift[]>(`members/${id}/shifts`);
  }

  create(
    orgId: string,
    body: { name: string; email: string; role?: MemberRole; teamIds?: string[] },
  ): Observable<Member> {
    return this.api.post<Member>(`organizations/${orgId}/members`, body);
  }

  update(id: string, body: { name?: string; priority?: number }): Observable<Member> {
    return this.api.put<Member>(`members/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`members/${id}`);
  }
}

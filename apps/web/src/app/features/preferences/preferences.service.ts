import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';
import { MemberPreference, PreferenceMode, PreferenceType } from '../../core/models';

export interface PreferenceInput {
  type: PreferenceType;
  params?: Record<string, unknown> | null;
  weight?: number;
  mode?: PreferenceMode;
}

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly api = inject(Api);

  listByMember(memberId: string): Observable<MemberPreference[]> {
    return this.api.list<MemberPreference>(`members/${memberId}/preferences`);
  }

  create(memberId: string, body: PreferenceInput): Observable<MemberPreference> {
    return this.api.post<MemberPreference>(`members/${memberId}/preferences`, body);
  }

  update(id: string, body: Partial<PreferenceInput>): Observable<MemberPreference> {
    return this.api.put<MemberPreference>(`preferences/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`preferences/${id}`);
  }

  approve(id: string): Observable<MemberPreference> {
    return this.api.post<MemberPreference>(`preferences/${id}/approve`);
  }

  revoke(id: string): Observable<MemberPreference> {
    return this.api.post<MemberPreference>(`preferences/${id}/revoke`);
  }
}

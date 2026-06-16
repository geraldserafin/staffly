import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';
import { Availability, AvailabilityKind } from '../../core/models';

export interface AvailabilityInput {
  kind: AvailabilityKind;
  recurrence?: 'weekly' | null;
  days?: number[] | null;
  start_time?: string | null;
  end_time?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  reason?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly api = inject(Api);

  listByMember(memberId: string): Observable<Availability[]> {
    return this.api.list<Availability>(`members/${memberId}/availabilities`);
  }

  create(memberId: string, body: AvailabilityInput): Observable<Availability> {
    return this.api.post<Availability>(`members/${memberId}/availabilities`, body);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`availabilities/${id}`);
  }
}

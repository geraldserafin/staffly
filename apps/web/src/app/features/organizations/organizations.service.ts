import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../core/api';
import { Organization, PayrollPeriod } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly api = inject(Api);

  list(): Observable<Organization[]> {
    return this.api.list<Organization>('organizations');
  }

  get(id: string): Observable<Organization> {
    return this.api.get<Organization>(`organizations/${id}`);
  }

  create(body: { name: string; payrollPeriod?: PayrollPeriod }): Observable<Organization> {
    return this.api.post<Organization>('organizations', body);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`organizations/${id}`);
  }
}

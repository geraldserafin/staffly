import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Organization } from '../../core/models';
import { CrudList } from '../../ui/crud-list';
import { OrganizationsService } from './organizations.service';

@Component({
  selector: 'app-organization-list',
  imports: [CrudList, RouterLink],
  template: `
    <h2>Organizations</h2>
    <app-crud-list
      heading="All organizations"
      placeholder="New organization name"
      addLabel="Create"
      emptyText="No organizations yet — create one to start."
      [items]="organizations()"
      [busy]="busy()"
      [error]="error()"
      (add)="create($event)"
    >
      <ng-template let-org>
        <a [routerLink]="['/orgs', org.id]">{{ org.name }}</a>
        <small>({{ org.payrollPeriod }})</small>
        <button (click)="remove(org)">delete</button>
      </ng-template>
    </app-crud-list>
  `,
})
export class OrganizationList {
  private readonly service = inject(OrganizationsService);
  readonly organizations = signal<Organization[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.busy.set(true);
    this.service.list().subscribe({
      next: (orgs) => {
        this.organizations.set(orgs);
        this.busy.set(false);
      },
      error: (e) => this.fail(e),
    });
  }

  create(name: string): void {
    this.busy.set(true);
    this.error.set(null);
    this.service.create({ name }).subscribe({ next: () => this.load(), error: (e) => this.fail(e) });
  }

  remove(org: Organization): void {
    this.busy.set(true);
    this.service.remove(org.id).subscribe({ next: () => this.load(), error: (e) => this.fail(e) });
  }

  private fail(e: unknown): void {
    this.error.set(errorMessage(e));
    this.busy.set(false);
  }
}

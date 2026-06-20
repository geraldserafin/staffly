import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Organization } from '../../core/models';
import { Icon } from '../../ui/icon';
import { CrudList } from '../../ui/crud-list';
import { OrganizationsService } from './organizations.service';

@Component({
  selector: 'app-organization-list',
  imports: [CrudList, RouterLink, Icon],
  template: `
    <header class="page-head">
      <div>
        <h2>Organizations</h2>
        <p class="subtitle">Pick an organization to manage its teams and schedules, or create a new one.</p>
      </div>
    </header>

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
        <a [routerLink]="['/orgs', org.id, 'dashboard']" style="font-weight:600">{{ org.name }}</a>
        <button class="icon-btn" style="margin-left:auto" (click)="remove(org)" title="Delete">
          <app-icon name="trash" [size]="16" />
        </button>
      </ng-template>
    </app-crud-list>
  `,
})
export class OrganizationList {
  private readonly service = inject(OrganizationsService);
  private readonly router = inject(Router);
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
        if (orgs.length === 0) {
          this.router.navigate(['/onboarding']);
        }
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

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Organization } from '../../core/models';
import { OrganizationsService } from './organizations.service';

@Component({
  selector: 'app-organization-list',
  imports: [FormsModule, RouterLink],
  template: `
    <h2>Organizations</h2>

    <form (submit)="create($event)">
      <input [(ngModel)]="name" name="name" placeholder="New organization name" required />
      <button type="submit">Create</button>
    </form>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <ul>
      @for (org of organizations(); track org.id) {
        <li>
          <a [routerLink]="['/orgs', org.id]">{{ org.name }}</a>
          <small>({{ org.payrollPeriod }})</small>
          <button (click)="remove(org)">delete</button>
        </li>
      } @empty {
        <li><em>No organizations yet — create one to start.</em></li>
      }
    </ul>
  `,
})
export class OrganizationList {
  private readonly service = inject(OrganizationsService);

  readonly organizations = signal<Organization[]>([]);
  readonly error = signal<string | null>(null);
  name = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.service.list().subscribe({
      next: (orgs) => this.organizations.set(orgs),
      error: (e) => this.error.set(this.message(e)),
    });
  }

  create(event: Event): void {
    event.preventDefault();
    if (!this.name.trim()) {
      return;
    }
    this.service.create({ name: this.name.trim() }).subscribe({
      next: () => {
        this.name = '';
        this.load();
      },
      error: (e) => this.error.set(this.message(e)),
    });
  }

  remove(org: Organization): void {
    this.service.remove(org.id).subscribe({ next: () => this.load() });
  }

  private message(e: unknown): string {
    const err = e as { error?: { message?: string }; message?: string };
    return err?.error?.message ?? err?.message ?? 'Request failed';
  }
}

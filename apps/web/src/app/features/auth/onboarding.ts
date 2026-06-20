import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth';
import { errorMessage } from '../../core/errors';
import { Icon } from '../../ui/icon';
import { OrganizationsService } from '../organizations/organizations.service';

@Component({
  selector: 'app-onboarding',
  imports: [FormsModule, Icon],
  template: `
    <div class="auth-card" style="max-width: 28rem">
      <div class="auth-brand">
        <span class="logo-mark">
          <app-icon name="calendar" [size]="20" />
        </span>
        Staffly
      </div>

      <h1>Welcome, {{ firstName() }}!</h1>
      <p class="auth-sub">
        Let's set up your first organization. This is where your teams, members, and schedules will live.
      </p>

      @if (error()) {
        <div class="auth-error">{{ error() }}</div>
      }

      <form class="auth-form" (ngSubmit)="submit()">
        <label>
          Organization name
          <input
            type="text"
            name="name"
            [(ngModel)]="form.name"
            required
            autofocus
            placeholder="Acme Corp"
          />
        </label>

        <button type="submit" class="primary" [disabled]="busy() || !form.name">
          {{ busy() ? 'Creating…' : 'Create organization' }}
        </button>
      </form>
    </div>
  `,
})
export class OnboardingPage {
  private readonly auth = inject(Auth);
  private readonly orgsService = inject(OrganizationsService);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = { name: '' };

  readonly firstName = () => this.auth.user()?.name.split(' ')[0] ?? '';

  submit(): void {
    if (!this.form.name) return;

    this.busy.set(true);
    this.error.set(null);

    this.orgsService.create({ name: this.form.name }).subscribe({
      next: (org) => {
        this.busy.set(false);
        this.router.navigate(['/orgs', org.id, 'dashboard']);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}

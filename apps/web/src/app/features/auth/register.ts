import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../ui/icon';
import { Auth } from '../../core/auth';
import { errorMessage } from '../../core/errors';

@Component({
  selector: 'app-register',
  imports: [FormsModule, Icon, RouterLink],
  template: `
    <div class="auth-card">
      <div class="auth-brand">
        <span class="logo-mark">
          <app-icon name="calendar" [size]="20" />
        </span>
        Staffly
      </div>

      <h1>Create your account</h1>
      <p class="auth-sub">Start managing your team's schedules in minutes.</p>

      @if (error()) {
        <div class="auth-error">{{ error() }}</div>
      }

      <form class="auth-form" (ngSubmit)="submit()">
        <label>
          Your name
          <input
            type="text"
            name="name"
            [(ngModel)]="form.name"
            required
            autocomplete="name"
            placeholder="Jane Doe"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            name="email"
            [(ngModel)]="form.email"
            required
            autocomplete="email"
            placeholder="you@example.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            [(ngModel)]="form.password"
            required
            autocomplete="new-password"
            placeholder="At least 8 characters"
          />
        </label>

        <button type="submit" class="primary" [disabled]="busy()">
          {{ busy() ? 'Creating…' : 'Create account' }}
        </button>
      </form>

      <p class="auth-footer">
        Already have an account? <a routerLink="/login">Sign in</a>
      </p>
    </div>
  `,
})
export class RegisterPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = {
    name: '',
    email: '',
    password: '',
  };

  submit(): void {
    if (!this.form.name || !this.form.email || !this.form.password) return;

    this.busy.set(true);
    this.error.set(null);

    this.auth.register(this.form).subscribe({
      next: () => {
        this.busy.set(false);
        this.router.navigate(['/onboarding']);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}

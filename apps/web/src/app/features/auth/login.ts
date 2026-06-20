import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '../../ui/icon';
import { Auth } from '../../core/auth';
import { errorMessage } from '../../core/errors';

@Component({
  selector: 'app-login',
  imports: [FormsModule, Icon, RouterLink],
  template: `
    <div class="auth-card">
      <div class="auth-brand">
        <span class="logo-mark">
          <app-icon name="calendar" [size]="20" />
        </span>
        Staffly
      </div>

      <h1>Welcome back</h1>
      <p class="auth-sub">Sign in to your account to continue.</p>

      @if (error()) {
        <div class="auth-error">{{ error() }}</div>
      }

      <form class="auth-form" (ngSubmit)="submit()">
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
            autocomplete="current-password"
            placeholder="••••••••"
          />
        </label>

        <button type="submit" class="primary" [disabled]="busy()">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="auth-footer">
        New to Staffly? <a routerLink="/register">Create an account</a>
      </p>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = { email: '', password: '' };

  submit(): void {
    if (!this.form.email || !this.form.password) return;

    this.busy.set(true);
    this.error.set(null);

    this.auth.login(this.form.email, this.form.password).subscribe({
      next: () => {
        this.busy.set(false);
        this.router.navigate(['/orgs']);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}

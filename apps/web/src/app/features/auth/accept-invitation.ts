import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '../../ui/icon';
import { Auth } from '../../core/auth';
import { errorMessage } from '../../core/errors';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-accept-invitation',
  imports: [FormsModule, Icon, RouterLink],
  template: `
    <div class="auth-card">
      <div class="auth-brand">
        <span class="logo-mark">
          <app-icon name="calendar" [size]="20" />
        </span>
        Staffly
      </div>

      @if (loading()) {
        <h1>Loading…</h1>
        <p class="auth-sub">Retrieving your invitation details.</p>
      } @else if (inviteError()) {
        <h1>Invitation unavailable</h1>
        <p class="auth-sub">{{ inviteError() }}</p>
        <p class="auth-footer">
          <a routerLink="/login">Go to sign in</a>
        </p>
      } @else if (rejected()) {
        <h1>Invitation rejected</h1>
        <p class="auth-sub">You've declined the invitation to join {{ orgName() }}.</p>
        <p class="auth-footer">
          <a routerLink="/login">Back to sign in</a>
        </p>
      } @else {
        <h1>Join {{ orgName() }}</h1>
        <p class="auth-sub">
          Hi {{ memberName() }}, you've been invited to join {{ orgName() }}.
          Set your password to activate your account, or decline if you're not interested.
        </p>

        @if (error()) {
          <div class="auth-error">{{ error() }}</div>
        }

        <form class="auth-form" (ngSubmit)="accept()">
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

          <label>
            Confirm password
            <input
              type="password"
              name="confirm"
              [(ngModel)]="form.confirm"
              required
              autocomplete="new-password"
              placeholder="Repeat password"
            />
          </label>

          <button type="submit" class="primary" [disabled]="busy()">
            {{ busy() ? 'Activating…' : 'Accept & activate' }}
          </button>
        </form>

        <button class="reject-btn" (click)="reject()" [disabled]="busy()">
          Decline invitation
        </button>
      }
    </div>
  `,
  styles: [
    `
      .reject-btn {
        display: block;
        width: 100%;
        margin-top: 0.75rem;
        padding: 0.5rem;
        background: transparent;
        border: 1px solid var(--border);
        color: var(--muted-foreground);
        font: inherit;
        font-size: 0.875rem;
        border-radius: var(--radius-sm);
        cursor: pointer;
      }
      .reject-btn:hover:not(:disabled) {
        color: hsl(0 80% 70%);
        border-color: hsl(0 80% 50% / 0.4);
      }
    `,
  ],
})
export class AcceptInvitationPage {
  private readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly inviteError = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly rejected = signal(false);
  readonly orgName = signal('');
  readonly memberName = signal('');
  readonly form = { password: '', confirm: '' };

  private token = '';

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.token = params.get('token') ?? '';
      if (!this.token) {
        this.loading.set(false);
        this.inviteError.set('Invalid invitation link.');
        return;
      }
      this.load();
    });
  }

  private load(): void {
    this.auth.getInvitation(this.token).subscribe({
      next: (res) => {
        this.orgName.set(res.organizationName);
        this.memberName.set(res.memberName);
        this.loading.set(false);
      },
      error: (e) => {
        const msg = errorMessage(e);
        this.inviteError.set(
          msg === 'Not Found' ? 'Invitation not found.' : msg,
        );
        this.loading.set(false);
      },
    });
  }

  accept(): void {
    if (!this.form.password) return;
    if (this.form.password !== this.form.confirm) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    this.auth.acceptInvitation(this.token, this.form.password).subscribe({
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

  reject(): void {
    this.busy.set(true);
    this.error.set(null);

    this.http
      .post(`${environment.apiBase}/invitations/${this.token}/reject`, {})
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.rejected.set(true);
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.busy.set(false);
        },
      });
  }
}

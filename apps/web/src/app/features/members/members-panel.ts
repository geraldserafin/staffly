import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Member, MemberRole, Team } from '../../core/models';
import { Icon } from '../../ui/icon';
import { MembersService } from './members.service';
import { TeamsService } from '../teams/teams.service';

@Component({
  selector: 'app-members-panel',
  imports: [FormsModule, Icon],
  template: `
    <header class="page-head">
      <div>
        <h2>Members</h2>
        <p class="subtitle">
          The people in this organization. New members receive an email invitation to set their password.
        </p>
      </div>
      <div class="actions">
        <button class="primary" (click)="openInvite()" [disabled]="busy()">
          <app-icon name="user-plus" [size]="16" /> Invite member
        </button>
      </div>
    </header>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <div class="card data-table-card" [attr.aria-busy]="busy()">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Teams</th>
            <th>Status</th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          @for (m of members(); track m.id) {
            <tr class="clickable-row" (click)="goToMember(m, $event)">
              <td>
                <span class="member-name">{{ m.name }}</span>
              </td>
              <td class="muted">{{ m.email ?? '—' }}</td>
              <td>
                <span class="role-badge role-{{ m.role }}">{{ m.role }}</span>
              </td>
              <td>
                @if (m.teams && m.teams.length > 0) {
                  <div class="team-chips">
                    @for (t of m.teams; track t.id) {
                      <span class="chip">{{ t.name }}</span>
                    }
                  </div>
                } @else {
                  <span class="muted">—</span>
                }
              </td>
              <td>
                @if (m.invitationAcceptedAt) {
                  <span class="status-badge status-active">
                    <app-icon name="circle-check" [size]="14" /> Active
                  </span>
                } @else {
                  <span class="status-badge status-pending">
                    <app-icon name="clock-alert" [size]="14" /> Pending
                  </span>
                }
              </td>
              <td class="col-actions">
                <button class="icon-btn" (click)="remove(m); $event.stopPropagation()" title="Remove member" [disabled]="busy()">
                  <app-icon name="trash" [size]="16" />
                </button>
              </td>
            </tr>
          } @empty {
            <tr class="empty-row">
              <td colspan="6">
                @if (busy()) {
                  Loading…
                } @else {
                  No members yet. Click "Invite member" to add one.
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (showModal()) {
      <div class="modal-overlay" (click)="closeInvite()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Invite member</h3>
            <button class="icon-btn" (click)="closeInvite()" title="Close">
              <app-icon name="x" [size]="18" />
            </button>
          </div>

          <form class="modal-form" (ngSubmit)="invite()">
            <div class="modal-body">
              <label class="field">
                <span class="field-label">Name</span>
                <input
                  type="text"
                  name="name"
                  [(ngModel)]="form.name"
                  required
                  autofocus
                  placeholder="Jane Doe"
                />
              </label>

              <label class="field">
                <span class="field-label">Email</span>
                <input
                  type="email"
                  name="email"
                  [(ngModel)]="form.email"
                  required
                  placeholder="jane@example.com"
                />
              </label>

              <div class="field">
                <span class="field-label">Role</span>
                <div class="radio-list">
                  @for (r of roleOptions; track r.value) {
                    <div class="radio-row" [class.selected]="form.role === r.value" (click)="selectRole(r.value)">
                      <span class="radio-dot"></span>
                      <span class="radio-text">
                        <span class="radio-title">{{ r.label }}</span>
                        <span class="radio-desc">{{ r.desc }}</span>
                      </span>
                    </div>
                  }
                </div>
              </div>

              @if (teams().length > 0) {
                <div class="field">
                  <span class="field-label">Teams</span>
                  <div class="checkbox-list">
                    @for (t of teams(); track t.id) {
                      <div class="checkbox-row" [class.checked]="selectedTeamIds().has(t.id)" (click)="toggleTeam(t.id)">
                        <span class="check-box">
                          @if (selectedTeamIds().has(t.id)) {
                            <app-icon name="check" [size]="12" />
                          }
                        </span>
                        <span>{{ t.name }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              @if (modalError()) {
                <p class="error">{{ modalError() }}</p>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="ghost" (click)="closeInvite()">Cancel</button>
              <button type="submit" class="primary" [disabled]="inviting() || !form.name || !form.email">
                {{ inviting() ? 'Sending…' : 'Send invitation' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .data-table-card {
        padding: 0;
        overflow: hidden;
      }
      .data-table {
        margin: 0;
        border: 0;
      }
      .data-table th {
        border-top: 0;
        border-left: 0;
        border-right: 0;
        padding: 0.65rem 0.9rem;
      }
      .data-table td {
        border-left: 0;
        border-right: 0;
        padding: 0.65rem 0.9rem;
        vertical-align: middle;
      }
      .data-table tbody tr:last-child td {
        border-bottom: 0;
      }
      .clickable-row {
        cursor: pointer;
        transition: background 0.1s;
      }
      .clickable-row:hover {
        background: var(--accent);
      }
      .col-actions {
        width: 3rem;
        text-align: right;
      }
      .col-actions button {
        float: right;
      }
      .member-name {
        font-weight: 600;
      }
      .team-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
      }
      .role-badge {
        display: inline-block;
        padding: 0.1rem 0.55rem;
        border-radius: 1rem;
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: capitalize;
        border: 1px solid var(--border);
        background: var(--muted);
        color: var(--muted-foreground);
      }
      .role-badge.role-owner {
        color: hsl(280 80% 75%);
        border-color: color-mix(in oklab, hsl(280 80% 60%), transparent 70%);
        background: color-mix(in oklab, hsl(280 80% 60%), transparent 90%);
      }
      .role-badge.role-manager {
        color: hsl(200 90% 75%);
        border-color: color-mix(in oklab, hsl(200 90% 60%), transparent 70%);
        background: color-mix(in oklab, hsl(200 90% 60%), transparent 90%);
      }
      .role-badge.role-member {
        color: var(--muted-foreground);
      }
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.78rem;
        font-weight: 500;
      }
      .status-active {
        color: hsl(142 65% 65%);
      }
      .status-pending {
        color: hsl(45 85% 70%);
      }
      .empty-row td {
        text-align: center;
        padding: 2.5rem 1rem;
        color: var(--muted-foreground);
        font-style: italic;
      }

      /* Modal form — reset global form styles */
      .modal-form {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        align-items: stretch;
        gap: 0;
        margin: 0;
        flex: 1;
        min-height: 0;
      }

      /* Radio list (role picker) */
      .radio-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .radio-row {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 0.6rem;
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--background);
        cursor: pointer;
        transition: border-color 0.12s, background 0.12s;
      }
      .radio-row:hover {
        border-color: color-mix(in oklab, var(--primary), transparent 55%);
        background: var(--accent);
      }
      .radio-row.selected {
        border-color: var(--primary);
        background: var(--primary-faded);
      }
      .radio-dot {
        flex-shrink: 0;
        width: 1rem;
        height: 1rem;
        margin-top: 0.15rem;
        border: 2px solid var(--border);
        border-radius: 50%;
        background: var(--background);
        transition: border-color 0.12s;
        position: relative;
      }
      .radio-row.selected .radio-dot {
        border-color: var(--primary);
      }
      .radio-row.selected .radio-dot::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: var(--primary);
      }
      .radio-text {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
      }
      .radio-title {
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--foreground);
      }
      .radio-desc {
        font-size: 0.78rem;
        color: var(--muted-foreground);
      }

      /* Checkbox list (teams) — flat, no card */
      .checkbox-list {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .checkbox-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.1rem;
        font-size: 0.88rem;
        color: var(--foreground);
        cursor: pointer;
      }
      .check-box {
        flex-shrink: 0;
        width: 1rem;
        height: 1rem;
        border: 2px solid var(--border);
        border-radius: 0.25rem;
        background: var(--background);
        display: grid;
        place-items: center;
        transition: border-color 0.12s, background 0.12s;
        color: var(--primary-foreground);
      }
      .checkbox-row.checked .check-box {
        border-color: var(--primary);
        background: var(--primary);
      }
    `,
  ],
})
export class MembersPanel {
  private readonly service = inject(MembersService);
  private readonly teamsService = inject(TeamsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly orgId = input.required<string>();
  readonly members = signal<Member[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly showModal = signal(false);
  readonly inviting = signal(false);
  readonly modalError = signal<string | null>(null);

  readonly form = { name: '', email: '', role: 'member' as MemberRole };
  readonly selectedTeamIds = signal<Set<string>>(new Set());

  readonly roleOptions: { value: MemberRole; label: string; desc: string }[] = [
    { value: 'member', label: 'Member', desc: 'View schedules and submit availability' },
    { value: 'manager', label: 'Manager', desc: 'Manage everything except org and member deletion' },
    { value: 'owner', label: 'Owner', desc: 'Full access to the organization' },
  ];

  ngOnInit(): void {
    this.load();
    this.loadTeams();
  }

  load(): void {
    this.busy.set(true);
    this.service.listByOrg(this.orgId()).subscribe({
      next: (m) => {
        this.members.set(m);
        this.busy.set(false);
      },
      error: (e) => this.fail(e),
    });
  }

  private loadTeams(): void {
    this.teamsService.listByOrg(this.orgId()).subscribe({
      next: (t) => this.teams.set(t),
      error: () => {},
    });
  }

  openInvite(): void {
    this.form.name = '';
    this.form.email = '';
    this.form.role = 'member';
    this.selectedTeamIds.set(new Set());
    this.modalError.set(null);
    this.showModal.set(true);
    this.maybeAutoSelectSingleTeam();
  }

  closeInvite(): void {
    this.showModal.set(false);
    this.modalError.set(null);
  }

  selectRole(role: MemberRole): void {
    this.form.role = role;
    this.maybeAutoSelectSingleTeam();
  }

  /** When role=member and exactly one team exists, auto-check it. */
  private maybeAutoSelectSingleTeam(): void {
    if (this.form.role === 'member' && this.teams().length === 1) {
      this.selectedTeamIds.set(new Set([this.teams()[0].id]));
    }
  }

  toggleTeam(id: string): void {
    const next = new Set(this.selectedTeamIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedTeamIds.set(next);
  }

  invite(): void {
    if (!this.form.name || !this.form.email) return;
    this.inviting.set(true);
    this.modalError.set(null);
    this.service
      .create(this.orgId(), {
        name: this.form.name,
        email: this.form.email,
        role: this.form.role,
        teamIds: [...this.selectedTeamIds()],
      })
      .subscribe({
        next: () => {
          this.inviting.set(false);
          this.showModal.set(false);
          this.load();
        },
        error: (e) => {
          this.modalError.set(errorMessage(e));
          this.inviting.set(false);
        },
      });
  }

  remove(m: Member): void {
    this.busy.set(true);
    this.service.remove(m.id).subscribe({ next: () => this.load(), error: (e) => this.fail(e) });
  }

  goToMember(m: Member, event: Event): void {
    if ((event.target as HTMLElement).closest('button')) return;
    this.router.navigate([m.id], { relativeTo: this.route });
  }

  private fail(e: unknown): void {
    this.error.set(errorMessage(e));
    this.busy.set(false);
  }
}

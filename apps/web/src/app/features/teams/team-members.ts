import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Member, Team } from '../../core/models';
import { MembersService } from '../members/members.service';
import { TeamsService } from './teams.service';

/** Team → members management: who's on the team, attach/detach org members. */
@Component({
  selector: 'app-team-members',
  imports: [FormsModule, RouterLink],
  template: `
    <nav class="breadcrumb">
      <a [routerLink]="['/orgs', orgId(), 'teams']">Teams</a>
      <span class="sep">/</span>
      <span class="current">{{ team()?.name ?? 'Team' }} · Members</span>
    </nav>

    <header class="page-head">
      <div>
        <h2>Members</h2>
        <p class="subtitle">{{ team()?.name ?? 'Loading…' }}</p>
      </div>
    </header>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <section [attr.aria-busy]="busy()">
      <h3>On this team ({{ teamMembers().length }})</h3>
      <ul>
        @for (m of teamMembers(); track m.id) {
          <li>
            <a [routerLink]="['/orgs', orgId(), 'members', m.id]">{{ m.name }}</a>
            <span class="muted">priority {{ m.priority }}</span>
            <button class="danger sm" style="margin-left:auto" (click)="detach(m)">Remove</button>
          </li>
        } @empty {
          <li class="empty">No members on this team yet.</li>
        }
      </ul>

      <hr />
      <h3 style="margin-bottom:.5rem">Add from organization</h3>
      <form (submit)="$event.preventDefault(); attach()">
        <select [(ngModel)]="memberToAdd" name="memberToAdd" style="min-width:14rem">
          <option [ngValue]="null">— select a member —</option>
          @for (m of attachable(); track m.id) {
            <option [ngValue]="m.id">{{ m.name }}</option>
          }
        </select>
        <button type="submit" class="primary" [disabled]="!memberToAdd || busy()">Attach</button>
      </form>
      @if (attachable().length === 0 && teamMembers().length) {
        <p class="muted" style="margin-top:.5rem">Everyone is already on this team.</p>
      }
    </section>
  `,
})
export class TeamMembers {
  private readonly teams = inject(TeamsService);
  private readonly membersService = inject(MembersService);

  readonly orgId = input.required<string>();
  readonly teamId = input.required<string>();

  readonly team = signal<Team | null>(null);
  readonly teamMembers = signal<Member[]>([]);
  readonly orgMembers = signal<Member[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  memberToAdd: string | null = null;

  readonly attachable = computed(() => {
    const on = new Set(this.teamMembers().map((m) => m.id));
    return this.orgMembers().filter((m) => !on.has(m.id));
  });

  ngOnInit(): void {
    this.teams.get(this.teamId()).subscribe((t) => this.team.set(t));
    this.membersService.listByOrg(this.orgId()).subscribe((m) => this.orgMembers.set(m));
    this.loadMembers();
  }

  private loadMembers(): void {
    this.busy.set(true);
    this.teams.members(this.teamId()).subscribe({
      next: (m) => {
        this.teamMembers.set(m);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }

  attach(): void {
    if (!this.memberToAdd) return;
    this.busy.set(true);
    this.teams.attachMember(this.teamId(), this.memberToAdd).subscribe({
      next: () => {
        this.memberToAdd = null;
        this.loadMembers();
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }

  detach(m: Member): void {
    this.busy.set(true);
    this.teams.detachMember(this.teamId(), m.id).subscribe({
      next: () => this.loadMembers(),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}

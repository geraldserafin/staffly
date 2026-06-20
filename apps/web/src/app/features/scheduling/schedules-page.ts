import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Schedule, Team } from '../../core/models';
import { TeamsService } from '../teams/teams.service';
import { SchedulingService } from './scheduling.service';

interface TeamSchedules {
  team: Team;
  schedules: Schedule[];
}

/** Org-wide schedules, grouped by team. Create a new schedule by picking a team. */
@Component({
  selector: 'app-schedules-page',
  imports: [FormsModule, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <h2>Schedules</h2>
        <p class="subtitle">Every schedule across this organization, grouped by team.</p>
      </div>
    </header>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <section>
      <h3>New schedule</h3>
      <p class="card-sub">Creating a schedule expands the team's templates into concrete shifts.</p>
      <form (submit)="create($event)">
        <label>team
          <select [(ngModel)]="form.teamId" name="teamId" required style="min-width:12rem">
            <option [ngValue]="null">— select a team —</option>
            @for (t of teams(); track t.id) {
              <option [ngValue]="t.id">{{ t.name }}</option>
            }
          </select>
        </label>
        <label>name <input [(ngModel)]="form.name" name="n" placeholder="e.g. July 2026" required /></label>
        <label>from <input type="date" [(ngModel)]="form.start_date" name="s" required /></label>
        <label>to <input type="date" [(ngModel)]="form.end_date" name="e" required /></label>
        <button type="submit" class="primary" [disabled]="busy() || !form.teamId">Create</button>
      </form>
      @if (teams().length === 0 && !busy()) {
        <p class="muted" style="margin-top:.5rem">Add a team first to create schedules.</p>
      }
    </section>

    @for (g of groups(); track g.team.id) {
      <section>
        <div class="actions" style="justify-content:space-between;margin-bottom:.5rem">
          <h3 style="margin:0">{{ g.team.name }}</h3>
          <a class="muted" [routerLink]="['/orgs', orgId(), 'teams', g.team.id, 'dashboard']">Manage team ›</a>
        </div>
        <ul>
          @for (s of g.schedules; track s.id) {
            <li>
              <a [routerLink]="[s.id]" style="font-weight:600">{{ s.name }}</a>
              <span class="muted">{{ s.startDate }} → {{ s.endDate }}</span>
              <span class="badge" [class.draft]="s.status === 'draft'"
                    [class.published]="s.status === 'published'"
                    [class.archived]="s.status === 'archived'"
                    style="margin-left:auto">{{ s.status }}</span>
            </li>
          } @empty {
            <li class="empty">No schedules for this team yet.</li>
          }
        </ul>
      </section>
    } @empty {
      @if (!busy()) {
        <section>
          <p class="empty">No teams yet — add a team first.</p>
        </section>
      }
    }
  `,
})
export class SchedulesPage {
  private readonly teamsService = inject(TeamsService);
  private readonly scheduling = inject(SchedulingService);

  readonly orgId = input.required<string>();
  readonly teams = signal<Team[]>([]);
  readonly groups = signal<TeamSchedules[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  form = { teamId: null as string | null, name: '', start_date: '', end_date: '' };

  ngOnInit(): void {
    this.busy.set(true);
    this.teamsService.listByOrg(this.orgId()).subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.groups.set(teams.map((team) => ({ team, schedules: [] })));
        this.busy.set(false);
        for (const team of teams) {
          this.scheduling.listByTeam(team.id).subscribe((schedules) =>
            this.groups.update((gs) =>
              gs.map((g) => (g.team.id === team.id ? { ...g, schedules } : g)),
            ),
          );
        }
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }

  create(event: Event): void {
    event.preventDefault();
    if (!this.form.teamId) return;
    this.error.set(null);
    this.busy.set(true);
    this.scheduling.create(this.form.teamId, { ...this.form }).subscribe({
      next: () => {
        this.form = { teamId: null, name: '', start_date: '', end_date: '' };
        this.reload();
      },
      error: (e) => {
        this.error.set(e?.error?.message ?? errorMessage(e));
        this.busy.set(false);
      },
    });
  }

  private reload(): void {
    const teams = this.teams();
    this.groups.set(teams.map((team) => ({ team, schedules: [] })));
    this.busy.set(false);
    for (const team of teams) {
      this.scheduling.listByTeam(team.id).subscribe((schedules) =>
        this.groups.update((gs) =>
          gs.map((g) => (g.team.id === team.id ? { ...g, schedules } : g)),
        ),
      );
    }
  }
}

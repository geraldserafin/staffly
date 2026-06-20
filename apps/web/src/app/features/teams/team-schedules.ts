import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Schedule, Team } from '../../core/models';
import { SchedulingService } from '../scheduling/scheduling.service';
import { TeamsService } from './teams.service';

/** Team → schedules: list this team's schedules and create a new one. */
@Component({
  selector: 'app-team-schedules',
  imports: [FormsModule, RouterLink],
  template: `
    <nav class="breadcrumb">
      <a [routerLink]="['/orgs', orgId(), 'teams']">Teams</a>
      <span class="sep">/</span>
      <span class="current">{{ team()?.name ?? 'Team' }} · Schedules</span>
    </nav>

    <header class="page-head">
      <div>
        <h2>Schedules</h2>
        <p class="subtitle">{{ team()?.name ?? 'Loading…' }}</p>
      </div>
    </header>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <section>
      <h3>New schedule</h3>
      <p class="card-sub">Creating a schedule expands the team's templates into concrete shifts.</p>
      <form (submit)="create($event)">
        <label>name <input [(ngModel)]="sched.name" name="n" placeholder="e.g. July 2026" required /></label>
        <label>from <input type="date" [(ngModel)]="sched.start_date" name="s" required /></label>
        <label>to <input type="date" [(ngModel)]="sched.end_date" name="e" required /></label>
        <button type="submit" class="primary" [disabled]="busy()">Create</button>
      </form>
    </section>

    <section [attr.aria-busy]="busy()">
      <h3>All schedules ({{ schedules().length }})</h3>
      <ul>
        @for (s of schedules(); track s.id) {
          <li>
            <a [routerLink]="['/orgs', orgId(), 'schedules', s.id]">{{ s.name }}</a>
            <span class="muted">{{ s.startDate }} → {{ s.endDate }}</span>
            <span class="badge" [class.draft]="s.status === 'draft'"
                  [class.published]="s.status === 'published'"
                  [class.archived]="s.status === 'archived'"
                  style="margin-left:auto">{{ s.status }}</span>
          </li>
        } @empty {
          <li class="empty">No schedules yet — create one above.</li>
        }
      </ul>
    </section>
  `,
})
export class TeamSchedules {
  private readonly teams = inject(TeamsService);
  private readonly scheduling = inject(SchedulingService);

  readonly orgId = input.required<string>();
  readonly teamId = input.required<string>();

  readonly team = signal<Team | null>(null);
  readonly schedules = signal<Schedule[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  sched = { name: '', start_date: '', end_date: '' };

  ngOnInit(): void {
    this.teams.get(this.teamId()).subscribe((t) => this.team.set(t));
    this.load();
  }

  private load(): void {
    this.busy.set(true);
    this.scheduling.listByTeam(this.teamId()).subscribe({
      next: (s) => {
        this.schedules.set(s);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }

  create(event: Event): void {
    event.preventDefault();
    this.error.set(null);
    this.busy.set(true);
    this.scheduling.create(this.teamId(), { ...this.sched }).subscribe({
      next: () => {
        this.sched = { name: '', start_date: '', end_date: '' };
        this.load();
      },
      error: (e) => {
        this.error.set(e?.error?.message ?? errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}

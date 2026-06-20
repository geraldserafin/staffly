import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Member, Schedule, ShiftTemplate, Team, TeamRule } from '../../core/models';
import { Icon } from '../../ui/icon';
import { SchedulingService } from '../scheduling/scheduling.service';
import { ShiftTemplatesService } from '../shift-templates/shift-templates.service';
import { TeamsService } from './teams.service';

/** Team landing screen: scale stats, recent schedules, and the rules card. */
@Component({
  selector: 'app-team-dashboard',
  imports: [FormsModule, RouterLink, Icon],
  template: `
    <nav class="breadcrumb">
      <a [routerLink]="['/orgs', orgId(), 'teams']">Teams</a>
      <span class="sep">/</span>
      <span class="current">{{ team()?.name ?? 'Team' }}</span>
    </nav>

    <header class="page-head">
      <div>
        <h2>{{ team()?.name ?? 'Loading…' }}</h2>
        <p class="subtitle">Team dashboard</p>
      </div>
    </header>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-icon"><app-icon name="users" [size]="18" /></span>
        <span class="stat-label">Members</span>
        <span class="stat-value">{{ teamMembers().length }}</span>
        <span class="stat-hint">on this team</span>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><app-icon name="calendar" [size]="18" /></span>
        <span class="stat-label">Schedules</span>
        <span class="stat-value">{{ schedules().length }}</span>
        <span class="stat-hint">{{ draftCount() }} draft · {{ publishedCount() }} published</span>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><app-icon name="clock" [size]="18" /></span>
        <span class="stat-label">Templates</span>
        <span class="stat-value">{{ templates().length }}</span>
        <span class="stat-hint">generate shifts here</span>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><app-icon name="shield" [size]="18" /></span>
        <span class="stat-label">Min rest</span>
        <span class="stat-value">{{ rules.min_rest_hours ?? '—' }}</span>
        <span class="stat-hint">hours between shifts</span>
      </div>
    </div>

    <section>
      <div class="actions" style="justify-content:space-between;margin-bottom:.5rem">
        <h3 style="margin:0">Recent schedules</h3>
        <a class="muted" [routerLink]="['/orgs', orgId(), 'teams', teamId(), 'schedules']">Manage ›</a>
      </div>
      <ul>
        @for (s of recentSchedules(); track s.id) {
          <li>
            <a [routerLink]="['/orgs', orgId(), 'schedules', s.id]" style="font-weight:600">{{ s.name }}</a>
            <span class="muted">{{ s.startDate }} → {{ s.endDate }}</span>
            <span class="badge" [class.draft]="s.status === 'draft'"
                  [class.published]="s.status === 'published'"
                  [class.archived]="s.status === 'archived'"
                  style="margin-left:auto">{{ s.status }}</span>
          </li>
        } @empty {
          <li class="empty">No schedules yet — create one on the Schedules page.</li>
        }
      </ul>
    </section>

    <section>
      <h3>Rules &amp; hard limits</h3>
      <p class="card-sub">Only <strong>min rest hours</strong> is enforced in v1.</p>
      <form (submit)="$event.preventDefault(); saveRules()">
        <label>min rest (h) <input type="number" [(ngModel)]="rules.min_rest_hours" name="mrh" /></label>
        <label>max h / week <input type="number" [(ngModel)]="rules.max_hours_per_week" name="mhw" /></label>
        <label>max consecutive days
          <input type="number" [(ngModel)]="rules.max_consecutive_days" name="mcd" />
        </label>
        <button type="submit" class="primary" [disabled]="!team()">Save rules</button>
      </form>
    </section>
  `,
})
export class TeamDashboard {
  private readonly teams = inject(TeamsService);
  private readonly scheduling = inject(SchedulingService);
  private readonly templatesService = inject(ShiftTemplatesService);

  readonly orgId = input.required<string>();
  readonly teamId = input.required<string>();

  readonly team = signal<Team | null>(null);
  readonly teamMembers = signal<Member[]>([]);
  readonly schedules = signal<Schedule[]>([]);
  readonly templates = signal<ShiftTemplate[]>([]);
  readonly error = signal<string | null>(null);

  rules: {
    min_rest_hours: number | null;
    max_hours_per_week: number | null;
    max_consecutive_days: number | null;
  } = { min_rest_hours: null, max_hours_per_week: null, max_consecutive_days: null };

  readonly draftCount = computed(() => this.schedules().filter((s) => s.status === 'draft').length);
  readonly publishedCount = computed(() => this.schedules().filter((s) => s.status === 'published').length);

  readonly recentSchedules = computed(() =>
    [...this.schedules()]
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
      .slice(0, 6),
  );

  ngOnInit(): void {
    this.teams.get(this.teamId()).subscribe({
      next: (t) => this.team.set(t),
      error: (e) => this.error.set(errorMessage(e)),
    });
    this.teams.members(this.teamId()).subscribe((m) => this.teamMembers.set(m));
    this.scheduling.listByTeam(this.teamId()).subscribe((s) => this.schedules.set(s));
    this.templatesService.byTeam(this.teamId()).subscribe((t) => this.templates.set(t));
    this.scheduling.rules(this.teamId()).subscribe({
      next: (r: TeamRule) =>
        (this.rules = {
          min_rest_hours: r.minRestHours,
          max_hours_per_week: r.maxHoursPerWeek,
          max_consecutive_days: r.maxConsecutiveDays,
        }),
      error: () => {},
    });
  }

  saveRules(): void {
    this.scheduling.updateRules(this.teamId(), { ...this.rules }).subscribe({
      next: () => this.error.set(null),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}

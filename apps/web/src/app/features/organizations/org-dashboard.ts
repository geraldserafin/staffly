import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Member, Organization, Schedule, Skill, ShiftTemplate, Team } from '../../core/models';
import { Icon } from '../../ui/icon';
import { MembersService } from '../members/members.service';
import { OrganizationsService } from './organizations.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { ShiftTemplatesService } from '../shift-templates/shift-templates.service';
import { SkillsService } from '../skills/skills.service';
import { TeamsService } from '../teams/teams.service';

interface TeamSchedule {
  team: Team;
  schedule: Schedule;
}

/** Org landing screen: a glance at scale (members/teams/skills/templates) and
 *  recent schedule activity across every team. */
@Component({
  selector: 'app-org-dashboard',
  imports: [RouterLink, Icon],
  template: `
    <header class="page-head">
      <div>
        <h2>{{ org()?.name ?? 'Dashboard' }}</h2>
        <p class="subtitle">Overview of your organization</p>
      </div>
    </header>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-icon"><app-icon name="users" [size]="18" /></span>
        <span class="stat-label">Members</span>
        <span class="stat-value">{{ members().length }}</span>
        <span class="stat-hint">people in this org</span>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><app-icon name="building" [size]="18" /></span>
        <span class="stat-label">Teams</span>
        <span class="stat-value">{{ teams().length }}</span>
        <span class="stat-hint">locations / groups</span>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><app-icon name="shield" [size]="18" /></span>
        <span class="stat-label">Skills</span>
        <span class="stat-value">{{ skills().length }}</span>
        <span class="stat-hint">org-wide catalog</span>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><app-icon name="clock" [size]="18" /></span>
        <span class="stat-label">Shift templates</span>
        <span class="stat-value">{{ templates().length }}</span>
        <span class="stat-hint">recurring demand</span>
      </div>
      <div class="stat-card">
        <span class="stat-icon"><app-icon name="calendar" [size]="18" /></span>
        <span class="stat-label">Schedules</span>
        <span class="stat-value">{{ allSchedules().length }}</span>
        <span class="stat-hint">{{ draftCount() }} draft · {{ publishedCount() }} published</span>
      </div>
    </div>

    <section>
      <div class="actions" style="justify-content:space-between;margin-bottom:.5rem">
        <h3 style="margin:0">Recent schedules</h3>
        <a class="muted" routerLink="../schedules">View all ›</a>
      </div>
      <ul>
        @for (ts of recentSchedules(); track ts.schedule.id) {
          <li>
            <a [routerLink]="['/orgs', orgId(), 'schedules', ts.schedule.id]" style="font-weight:600">
              {{ ts.schedule.name }}
            </a>
            <span class="muted">{{ ts.team.name }}</span>
            <span class="muted">{{ ts.schedule.startDate }} → {{ ts.schedule.endDate }}</span>
            <span class="badge" [class.draft]="ts.schedule.status === 'draft'"
                  [class.published]="ts.schedule.status === 'published'"
                  [class.archived]="ts.schedule.status === 'archived'"
                  style="margin-left:auto">{{ ts.schedule.status }}</span>
          </li>
        } @empty {
          <li class="empty">No schedules yet — create one from a team's Schedules page.</li>
        }
      </ul>
    </section>

    <section>
      <div class="actions" style="justify-content:space-between;margin-bottom:.5rem">
        <h3 style="margin:0">Teams</h3>
        <a class="muted" routerLink="../teams">Manage ›</a>
      </div>
      <ul>
        @for (t of teams(); track t.id) {
          <li>
            <a [routerLink]="['/orgs', orgId(), 'teams', t.id, 'dashboard']" style="font-weight:600">{{ t.name }}</a>
            <span class="muted">→ dashboard</span>
            <a class="muted" style="margin-left:auto" [routerLink]="['/orgs', orgId(), 'teams', t.id, 'schedules']">
              schedules ›
            </a>
          </li>
        } @empty {
          <li class="empty">No teams yet — add a team to start scheduling.</li>
        }
      </ul>
    </section>
  `,
})
export class OrgDashboard {
  private readonly orgsService = inject(OrganizationsService);
  private readonly membersService = inject(MembersService);
  private readonly teamsService = inject(TeamsService);
  private readonly skillsService = inject(SkillsService);
  private readonly templatesService = inject(ShiftTemplatesService);
  private readonly scheduling = inject(SchedulingService);

  readonly orgId = input.required<string>();

  readonly org = signal<Organization | null>(null);
  readonly members = signal<Member[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly skills = signal<Skill[]>([]);
  readonly templates = signal<ShiftTemplate[]>([]);
  readonly allSchedules = signal<TeamSchedule[]>([]);
  readonly error = signal<string | null>(null);

  readonly draftCount = computed(() => this.allSchedules().filter((s) => s.schedule.status === 'draft').length);
  readonly publishedCount = computed(
    () => this.allSchedules().filter((s) => s.schedule.status === 'published').length,
  );

  /** Most recently created schedules first, top 6. */
  readonly recentSchedules = computed(() =>
    [...this.allSchedules()]
      .sort((a, b) => (b.schedule.createdAt > a.schedule.createdAt ? 1 : -1))
      .slice(0, 6),
  );

  ngOnInit(): void {
    this.orgsService.get(this.orgId()).subscribe({
      next: (o) => this.org.set(o),
      error: (e) => this.error.set(errorMessage(e)),
    });
    this.membersService.listByOrg(this.orgId()).subscribe((m) => this.members.set(m));
    this.skillsService.listByOrg(this.orgId()).subscribe((s) => this.skills.set(s));
    this.templatesService.listByOrg(this.orgId()).subscribe((t) => this.templates.set(t));
    this.teamsService.listByOrg(this.orgId()).subscribe({
      next: (teams) => {
        this.teams.set(teams);
        for (const team of teams) {
          this.scheduling.listByTeam(team.id).subscribe((schedules) =>
            this.allSchedules.update((cur) => [...cur, ...schedules.map((s) => ({ team, schedule: s }))]),
          );
        }
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}

import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Schedule, Team } from '../../core/models';
import { TeamsService } from '../teams/teams.service';
import { SchedulingService } from './scheduling.service';

interface TeamSchedules {
  team: Team;
  schedules: Schedule[];
}

/** Org-wide roll-up of schedules grouped by team. Creation lives on the team page. */
@Component({
  selector: 'app-schedules-page',
  imports: [RouterLink],
  template: `
    <h2>Schedules</h2>
    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    @for (g of groups(); track g.team.id) {
      <section>
        <h3>
          {{ g.team.name }}
          <a class="muted" [routerLink]="['../teams', g.team.id]">manage team ›</a>
        </h3>
        <ul>
          @for (s of g.schedules; track s.id) {
            <li>
              <a [routerLink]="[s.id]">{{ s.name }}</a>
              <small>{{ s.startDate }} → {{ s.endDate }} · {{ s.status }}</small>
            </li>
          } @empty {
            <li class="empty">No schedules — create one from the team page.</li>
          }
        </ul>
      </section>
    } @empty {
      <p class="empty">{{ busy() ? 'Loading…' : 'No teams yet — add a team first.' }}</p>
    }
  `,
})
export class SchedulesPage {
  private readonly teams = inject(TeamsService);
  private readonly scheduling = inject(SchedulingService);

  readonly orgId = input.required<string>();
  readonly groups = signal<TeamSchedules[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.busy.set(true);
    this.teams.listByOrg(this.orgId()).subscribe({
      next: (teams) => {
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
}

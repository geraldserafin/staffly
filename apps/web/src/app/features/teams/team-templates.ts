import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { ShiftTemplate, Team } from '../../core/models';
import { ShiftTemplatesService } from '../shift-templates/shift-templates.service';
import { TeamsService } from './teams.service';

/** Team → shift templates: which templates generate shifts for this team. */
@Component({
  selector: 'app-team-templates',
  imports: [FormsModule, RouterLink],
  template: `
    <nav class="breadcrumb">
      <a [routerLink]="['/orgs', orgId(), 'teams']">Teams</a>
      <span class="sep">/</span>
      <span class="current">{{ team()?.name ?? 'Team' }} · Templates</span>
    </nav>

    <header class="page-head">
      <div>
        <h2>Shift templates</h2>
        <p class="subtitle">What generates shifts for {{ team()?.name ?? 'this team' }}</p>
      </div>
    </header>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <section [attr.aria-busy]="busy()">
      <h3>Applicable ({{ applicableTemplates().length }})</h3>
      <p class="card-sub">Templates with no team scope apply to every team; scoped ones apply only where attached.</p>
      <ul>
        @for (tpl of applicableTemplates(); track tpl.id) {
          <li>
            <div style="display:flex;flex-direction:column;gap:.1rem">
              <strong>{{ tpl.name }}</strong>
              <span class="muted">{{ tpl.startTime }}–{{ tpl.endTime }}</span>
            </div>
            @if (tpl.teamIds?.length) {
              <span class="chip">scoped</span>
              <button class="danger sm" style="margin-left:auto" (click)="detachTemplate(tpl)">Detach</button>
            } @else {
              <span class="chip" style="margin-left:auto">all teams</span>
            }
          </li>
        } @empty {
          <li class="empty">None apply — attach one below, or create org-wide templates.</li>
        }
      </ul>
    </section>

    @if (otherTemplates().length) {
      <section>
        <h3>Attach another</h3>
        <ul>
          @for (tpl of otherTemplates(); track tpl.id) {
            <li>
              <div style="display:flex;flex-direction:column;gap:.1rem">
                <strong>{{ tpl.name }}</strong>
                <span class="muted">{{ tpl.startTime }}–{{ tpl.endTime }}</span>
              </div>
              <button class="primary sm" style="margin-left:auto" (click)="attachTemplate(tpl)">Attach</button>
            </li>
          }
        </ul>
        <p class="muted" style="margin-top:.5rem">
          Manage org-wide templates under
          <a [routerLink]="['/orgs', orgId(), 'templates']" style="color:var(--primary)">Shift templates</a>.
        </p>
      </section>
    }
  `,
})
export class TeamTemplates {
  private readonly teams = inject(TeamsService);
  private readonly templatesService = inject(ShiftTemplatesService);

  readonly orgId = input.required<string>();
  readonly teamId = input.required<string>();

  readonly team = signal<Team | null>(null);
  readonly applicableTemplates = signal<ShiftTemplate[]>([]);
  readonly orgTemplates = signal<ShiftTemplate[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly otherTemplates = computed(() => {
    const applied = new Set(this.applicableTemplates().map((t) => t.id));
    return this.orgTemplates().filter((t) => !applied.has(t.id));
  });

  ngOnInit(): void {
    this.teams.get(this.teamId()).subscribe((t) => this.team.set(t));
    this.templatesService.listByOrg(this.orgId()).subscribe((t) => this.orgTemplates.set(t));
    this.load();
  }

  private load(): void {
    this.busy.set(true);
    this.templatesService.byTeam(this.teamId()).subscribe({
      next: (t) => {
        this.applicableTemplates.set(t);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }

  attachTemplate(tpl: ShiftTemplate): void {
    this.templatesService.attachToTeam(this.teamId(), tpl.id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  detachTemplate(tpl: ShiftTemplate): void {
    this.templatesService.detachFromTeam(this.teamId(), tpl.id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}

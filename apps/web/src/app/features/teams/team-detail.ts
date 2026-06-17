import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Member, Schedule, ShiftTemplate, Team } from '../../core/models';
import { MembersService } from '../members/members.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { ShiftTemplatesService } from '../shift-templates/shift-templates.service';
import { TeamsService } from './teams.service';

@Component({
  selector: 'app-team-detail',
  imports: [FormsModule, RouterLink],
  template: `
    <a class="muted" routerLink="..">‹ Teams</a>
    @if (team(); as t) {
      <h2>Team: {{ t.name }}</h2>

      <section>
        <h3>Rules (hard limits)</h3>
        <label>min rest h <input type="number" [(ngModel)]="rules.min_rest_hours" name="mrh" /></label>
        <label>max h/week <input type="number" [(ngModel)]="rules.max_hours_per_week" name="mhw" /></label>
        <label>max consec days <input type="number" [(ngModel)]="rules.max_consecutive_days" name="mcd" /></label>
        <button (click)="saveRules()">save rules</button>
        <small>(only min rest is enforced in v1)</small>
      </section>

      <section>
        <h3>Members</h3>
        <ul>
          @for (m of teamMembers(); track m.id) {
            <li>{{ m.name }} <button (click)="detach(m)">remove from team</button></li>
          } @empty {
            <li><em>No members on this team.</em></li>
          }
        </ul>
        <select [(ngModel)]="memberToAdd" name="memberToAdd">
          <option [ngValue]="null">— add org member —</option>
          @for (m of attachable(); track m.id) {
            <option [ngValue]="m.id">{{ m.name }}</option>
          }
        </select>
        <button (click)="attach()">attach</button>
      </section>

      <section>
        <h3>Shift templates generating for this team</h3>
        <ul>
          @for (tpl of applicableTemplates(); track tpl.id) {
            <li>
              {{ tpl.name }} ({{ tpl.startTime }}–{{ tpl.endTime }})
              @if (tpl.teamIds?.length) {
                — scoped <button (click)="detachTemplate(tpl)">detach</button>
              } @else {
                — <em>all teams</em>
              }
            </li>
          } @empty {
            <li><em>None apply — attach one below, or create org-wide templates.</em></li>
          }
        </ul>
        @if (otherTemplates().length) {
          <p>Attach another:</p>
          <ul>
            @for (tpl of otherTemplates(); track tpl.id) {
              <li>{{ tpl.name }} <button (click)="attachTemplate(tpl)">attach</button></li>
            }
          </ul>
        }
        <small>Templates generate shifts when a schedule is created or regenerated.</small>
      </section>

      <section>
        <h3>Schedules</h3>
        <form (submit)="createSchedule($event)">
          <input [(ngModel)]="sched.name" name="schedName" placeholder="Schedule name" required />
          <label>from <input type="date" [(ngModel)]="sched.start_date" name="schedStart" required /></label>
          <label>to <input type="date" [(ngModel)]="sched.end_date" name="schedEnd" required /></label>
          <button type="submit">Create (generates shifts)</button>
        </form>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <ul>
          @for (s of schedules(); track s.id) {
            <li>
              <a [routerLink]="['/orgs', t.organizationId, 'schedules', s.id]">{{ s.name }}</a>
              <small>{{ s.startDate }}→{{ s.endDate }} · {{ s.status }}</small>
            </li>
          } @empty {
            <li><em>No schedules.</em></li>
          }
        </ul>
      </section>
    }
  `,
})
export class TeamDetail {
  private readonly teams = inject(TeamsService);
  private readonly membersService = inject(MembersService);
  private readonly scheduling = inject(SchedulingService);
  private readonly templatesService = inject(ShiftTemplatesService);

  readonly teamId = input.required<string>();
  readonly team = signal<Team | null>(null);
  readonly teamMembers = signal<Member[]>([]);
  readonly orgMembers = signal<Member[]>([]);
  readonly schedules = signal<Schedule[]>([]);
  readonly applicableTemplates = signal<ShiftTemplate[]>([]);
  readonly orgTemplates = signal<ShiftTemplate[]>([]);
  readonly error = signal<string | null>(null);

  readonly attachable = computed(() => {
    const on = new Set(this.teamMembers().map((m) => m.id));
    return this.orgMembers().filter((m) => !on.has(m.id));
  });

  readonly otherTemplates = computed(() => {
    const applied = new Set(this.applicableTemplates().map((t) => t.id));
    return this.orgTemplates().filter((t) => !applied.has(t.id));
  });

  rules: { min_rest_hours: number | null; max_hours_per_week: number | null; max_consecutive_days: number | null } = {
    min_rest_hours: null,
    max_hours_per_week: null,
    max_consecutive_days: null,
  };
  memberToAdd: string | null = null;
  sched = { name: '', start_date: '', end_date: '' };

  ngOnInit(): void {
    this.teams.get(this.teamId()).subscribe((t) => {
      this.team.set(t);
      this.membersService.listByOrg(t.organizationId).subscribe((m) => this.orgMembers.set(m));
      this.templatesService.listByOrg(t.organizationId).subscribe((tpl) => this.orgTemplates.set(tpl));
    });
    this.loadMembers();
    this.loadSchedules();
    this.loadTemplates();
    this.scheduling.rules(this.teamId()).subscribe({
      next: (r) =>
        (this.rules = {
          min_rest_hours: r.minRestHours,
          max_hours_per_week: r.maxHoursPerWeek,
          max_consecutive_days: r.maxConsecutiveDays,
        }),
      error: () => {},
    });
  }

  private loadMembers(): void {
    this.teams.members(this.teamId()).subscribe((m) => this.teamMembers.set(m));
  }
  private loadSchedules(): void {
    this.scheduling.listByTeam(this.teamId()).subscribe((s) => this.schedules.set(s));
  }
  private loadTemplates(): void {
    this.templatesService.byTeam(this.teamId()).subscribe((t) => this.applicableTemplates.set(t));
  }

  attachTemplate(tpl: ShiftTemplate): void {
    this.templatesService.attachToTeam(this.teamId(), tpl.id).subscribe(() => this.loadTemplates());
  }
  detachTemplate(tpl: ShiftTemplate): void {
    this.templatesService.detachFromTeam(this.teamId(), tpl.id).subscribe(() => this.loadTemplates());
  }

  saveRules(): void {
    this.scheduling.updateRules(this.teamId(), this.rules).subscribe();
  }

  attach(): void {
    if (!this.memberToAdd) return;
    this.teams.attachMember(this.teamId(), this.memberToAdd).subscribe(() => {
      this.memberToAdd = null;
      this.loadMembers();
    });
  }
  detach(m: Member): void {
    this.teams.detachMember(this.teamId(), m.id).subscribe(() => this.loadMembers());
  }

  createSchedule(event: Event): void {
    event.preventDefault();
    this.error.set(null);
    this.scheduling.create(this.teamId(), { ...this.sched }).subscribe({
      next: () => {
        this.sched = { name: '', start_date: '', end_date: '' };
        this.loadSchedules();
      },
      error: (e) => this.error.set(e?.error?.message ?? 'Failed'),
    });
  }
}

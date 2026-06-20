import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Icon } from '../../ui/icon';
import {
  Insights,
  Member,
  PreviewResult,
  RequirementType,
  Schedule,
  ScheduledShift,
  Skill,
  SolveRun,
} from '../../core/models';
import { SkillsService } from '../skills/skills.service';
import { TeamsService } from '../teams/teams.service';
import { SchedulingService } from './scheduling.service';

type Tab = 'roster' | 'shifts' | 'runs' | 'insights' | 'tuning';

@Component({
  selector: 'app-schedule-detail',
  imports: [FormsModule, RouterLink, Icon],
  template: `
    <nav class="breadcrumb">
      <a routerLink="..">Schedules</a>
      <span class="sep">/</span>
      <span class="current">{{ schedule()?.name ?? 'Schedule' }}</span>
    </nav>

    @if (schedule(); as s) {
      <header class="page-head">
        <div>
          <h2>{{ s.name }}</h2>
          <p class="subtitle">
            {{ s.startDate }} → {{ s.endDate }}
            <span class="badge" [class.draft]="s.status === 'draft'"
                  [class.published]="s.status === 'published'"
                  [class.archived]="s.status === 'archived'">{{ s.status }}</span>
          </p>
        </div>
        <div class="actions">
          <button class="primary" (click)="solve()" [disabled]="solving()">
            <app-icon name="play" [size]="15" />
            {{ solving() ? 'Solving…' : 'Solve' }}
          </button>
          <button (click)="publish()">Publish</button>
          <button (click)="archive()">Archive</button>
          @if (solveStatus()) {
            <span class="badge" [class.pending]="solveStatus() === 'pending'"
                  [class.running]="solveStatus() === 'running'"
                  [class.succeeded]="solveStatus() === 'succeeded'"
                  [class.failed]="solveStatus() === 'failed'">{{ solveStatus() }}</span>
          }
        </div>
      </header>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <nav class="tabs">
        @for (t of tabs; track t) {
          <button [class.active]="tab() === t" (click)="select(t)">{{ t }}</button>
        }
      </nav>

      @switch (tab()) {
        @case ('roster') {
          <section [attr.aria-busy]="solving()">
            <p class="muted">
              Assigned shift per member per day — first letter of the shift type. Blank = off.
            </p>
            @if (legend().length) {
              <p class="legend">
                @for (l of legend(); track l.initial) {
                  <span class="chip">{{ l.initial }} = {{ l.label }}</span>
                }
              </p>
            }
            <div class="roster">
              <table>
                <thead>
                  <tr>
                    <th class="corner">Member</th>
                    @for (d of dates(); track d) {
                      <th [class.weekend]="isWeekend(d)">
                        <span class="muted">{{ weekday(d) }}</span><br />{{ dayNum(d) }}
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of roster(); track row.member.id) {
                    <tr>
                      <th class="rowhead">{{ row.member.name }}</th>
                      @for (c of row.cells; track c.date) {
                        <td [class.weekend]="isWeekend(c.date)" [title]="c.date">{{ c.letters.join('/') }}</td>
                      }
                    </tr>
                  } @empty {
                    <tr><td class="empty">No team members.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }

        @case ('shifts') {
          <section>
            <div class="actions" style="justify-content:space-between">
              <button (click)="regenerate()">
                <app-icon name="refresh" [size]="15" /> Regenerate from templates
              </button>
              <small class="muted">replaces template-generated shifts; keeps manual ones</small>
            </div>

            <form (submit)="addShift($event)" style="margin-top:1rem">
              <label>name <input [(ngModel)]="sh.name" name="shName" placeholder="name" required /></label>
              <label>start <input [(ngModel)]="sh.start_at" name="shStart" type="datetime-local" required /></label>
              <label>end <input [(ngModel)]="sh.end_at" name="shEnd" type="datetime-local" required /></label>
              <label>rest h <input [(ngModel)]="sh.rest_hours_after" name="shRest" type="number" style="width:5rem" /></label>
              <button type="submit" class="primary">Add shift</button>
            </form>
          </section>

          @for (shift of shifts(); track shift.id) {
            <section>
              <div class="actions" style="justify-content:space-between;margin-bottom:.75rem">
                <div>
                  <strong>{{ shift.name }}</strong>
                  <span class="muted" style="margin-left:.5rem">{{ shift.startAt }} → {{ shift.endAt }}</span>
                </div>
                <button class="icon-btn" (click)="deleteShift(shift)" title="Delete shift">
                  <app-icon name="trash" [size]="16" />
                </button>
              </div>

              <div class="cols">
                <div>
                  <strong class="muted" style="display:block;margin-bottom:.4rem;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em">Requirements</strong>
                  <ul>
                    @for (r of shift.requirements; track r.id) {
                      <li>
                        <span class="badge">{{ r.type }}</span>
                        <span class="muted">{{ skillName(r.skillId) }}</span>
                        <span class="muted">×{{ r.count ?? '—' }}</span>
                        <button class="icon-btn" style="margin-left:auto" (click)="deleteReq(r.id)" title="Remove">
                          <app-icon name="x" [size]="15" />
                        </button>
                      </li>
                    } @empty {
                      <li class="empty">None.</li>
                    }
                  </ul>
                  <form (submit)="$event.preventDefault(); addReq(shift)" class="actions" style="margin-top:.5rem">
                    <select [(ngModel)]="reqType[shift.id]" [name]="'rt' + shift.id">
                      <option value="headcount">headcount</option>
                      <option value="coverage">coverage</option>
                    </select>
                    <select [(ngModel)]="reqSkill[shift.id]" [name]="'rs' + shift.id" style="min-width:8rem">
                      <option [ngValue]="null">Any</option>
                      @for (sk of skills(); track sk.id) {
                        <option [ngValue]="sk.id">{{ sk.name }}</option>
                      }
                    </select>
                    <input [(ngModel)]="reqCount[shift.id]" [name]="'rc' + shift.id" type="number" placeholder="count" style="width:5rem" />
                    <button type="submit" class="primary sm">+ req</button>
                  </form>
                </div>

                <div>
                  <strong class="muted" style="display:block;margin-bottom:.4rem;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em">Assignments</strong>
                  <ul>
                    @for (a of shift.assignments; track a.id) {
                      <li>
                        <span>{{ memberName(a.memberId) }}</span>
                        @if (a.locked) {
                          <app-icon name="lock" [size]="13" />
                        }
                        <button class="sm" style="margin-left:auto" (click)="toggleLock(a)">
                          {{ a.locked ? 'Unlock' : 'Lock' }}
                        </button>
                        <button class="icon-btn" (click)="unassign(shift, a.memberId)" title="Remove">
                          <app-icon name="x" [size]="15" />
                        </button>
                      </li>
                    } @empty {
                      <li class="empty">Unassigned.</li>
                    }
                  </ul>
                  <form (submit)="$event.preventDefault(); assign(shift)" class="actions" style="margin-top:.5rem">
                    <select [(ngModel)]="assignMember[shift.id]" [name]="'am' + shift.id" style="min-width:10rem">
                      <option [ngValue]="null">— member —</option>
                      @for (m of teamMembers(); track m.id) {
                        <option [ngValue]="m.id">{{ m.name }}</option>
                      }
                    </select>
                    <button type="submit" class="primary sm" [disabled]="!assignMember[shift.id]">Assign</button>
                  </form>
                </div>
              </div>
            </section>
          } @empty {
            <section><p class="empty">No shifts — regenerate from templates or add one above.</p></section>
          }
        }

        @case ('runs') {
          <section>
            <div class="actions" style="justify-content:space-between;margin-bottom:.5rem">
              <h3 style="margin:0">Solve runs</h3>
              <button class="ghost sm" (click)="loadRuns()">
                <app-icon name="refresh" [size]="14" /> Refresh
              </button>
            </div>
            <ul>
              @for (r of runs(); track r.id) {
                <li>
                  <span class="badge" [class.pending]="r.status === 'pending'"
                        [class.running]="r.status === 'running'"
                        [class.succeeded]="r.status === 'succeeded'"
                        [class.failed]="r.status === 'failed'">{{ r.status }}</span>
                  <span class="muted">{{ r.createdAt }}</span>
                  @if (r.resultSnapshot) {
                    <span class="chip">{{ r.resultSnapshot.length }} assignments</span>
                    <button class="primary sm" style="margin-left:auto" (click)="applyRun(r)">Apply</button>
                  }
                </li>
              } @empty {
                <li class="empty">No runs yet — hit Solve to start one.</li>
              }
            </ul>
          </section>
        }

        @case ('insights') {
          <section>
            <div class="actions" style="justify-content:space-between;margin-bottom:.75rem">
              <h3 style="margin:0">Insights</h3>
              <button class="ghost sm" (click)="loadInsights()">
                <app-icon name="refresh" [size]="14" /> Refresh
              </button>
            </div>
            @if (insights(); as i) {
              <table>
                <thead>
                  <tr><th>Member</th><th>Shifts</th><th>Hours</th><th>Dissatisfaction</th></tr>
                </thead>
                <tbody>
                  @for (m of i.members; track m.memberId) {
                    <tr>
                      <td>{{ m.name }}</td>
                      <td>{{ m.assignedShifts }}</td>
                      <td>{{ m.hours }}</td>
                      <td>{{ m.dissatisfaction ?? '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              <p class="muted" style="margin-top:.75rem">
                Gaps: {{ i.staffingGaps.length }} · fairness max {{ i.fairness.maxDissatisfaction }}
                · from last solve: {{ i.fairness.fromLastSolve }}
              </p>
            } @else {
              <p class="empty">No insights loaded — refresh to compute.</p>
            }
          </section>
        }

        @case ('tuning') {
          <section>
            <h3>Fairness tuning (live preview)</h3>
            <p class="card-sub">Try a fairness λ without writing assignments. 0 = efficiency, 1 = equity.</p>
            <form (submit)="$event.preventDefault(); preview()" class="actions">
              <label style="flex-direction:row;align-items:center;gap:.4rem">
                <span class="muted">λ</span>
                <input type="number" step="0.1" min="0" max="1" [(ngModel)]="lambda" name="lambda" style="width:5rem" />
              </label>
              <button type="submit" class="primary">
                <app-icon name="eye" [size]="15" /> Preview
              </button>
            </form>
            @if (previewResult(); as p) {
              <pre>{{ summary(p) }}</pre>
            }
          </section>
        }
      }
    } @else if (error()) {
      <p class="error">{{ error() }}</p>
    } @else {
      <p class="empty">Loading…</p>
    }
  `,
})
export class ScheduleDetail {
  private readonly scheduling = inject(SchedulingService);
  private readonly teams = inject(TeamsService);
  private readonly skillsService = inject(SkillsService);

  readonly scheduleId = input.required<string>();
  readonly schedule = signal<Schedule | null>(null);
  readonly shifts = signal<ScheduledShift[]>([]);
  readonly teamMembers = signal<Member[]>([]);
  readonly skills = signal<Skill[]>([]);
  readonly runs = signal<SolveRun[]>([]);
  readonly previewResult = signal<PreviewResult | null>(null);
  readonly insights = signal<Insights | null>(null);
  readonly solveStatus = signal<string | null>(null);
  readonly solving = signal(false);
  readonly error = signal<string | null>(null);

  readonly tabs: Tab[] = ['roster', 'shifts', 'runs', 'insights', 'tuning'];
  readonly tab = signal<Tab>('roster');

  private readonly memberNames = computed(() => new Map(this.teamMembers().map((m) => [m.id, m.name])));

  // Dates spanning the schedule, as yyyy-mm-dd strings (matches shift.startAt prefix).
  readonly dates = computed(() => {
    const s = this.schedule();
    return s ? this.dateList(s.startDate, s.endDate) : [];
  });

  // Member × day matrix: each cell holds the shift-type initials assigned that day.
  readonly roster = computed(() => {
    const byDate: Record<string, ScheduledShift[]> = {};
    for (const sh of this.shifts()) {
      (byDate[sh.startAt.slice(0, 10)] ??= []).push(sh);
    }
    return this.teamMembers().map((member) => ({
      member,
      cells: this.dates().map((date) => ({
        date,
        letters: (byDate[date] ?? [])
          .filter((sh) => (sh.assignments ?? []).some((a) => a.memberId === member.id))
          .map((sh) => this.initial(sh)),
      })),
    }));
  });

  // Distinct shift types present, for the matrix legend.
  readonly legend = computed(() => {
    const seen = new Map<string, string>();
    for (const sh of this.shifts()) {
      const label = sh.name;
      if (label) {
        seen.set(this.initial(sh), label);
      }
    }
    return [...seen].map(([initial, label]) => ({ initial, label }));
  });

  lambda = 0.3;
  sh = { name: '', start_at: '', end_at: '', rest_hours_after: null as number | null };
  reqType: Record<string, RequirementType> = {};
  reqSkill: Record<string, string | null> = {};
  reqCount: Record<string, number | null> = {};
  assignMember: Record<string, string | null> = {};

  ngOnInit(): void {
    this.scheduling.get(this.scheduleId()).subscribe({
      next: (s) => {
        this.schedule.set(s);
        this.teams.members(s.teamId).subscribe((m) => this.teamMembers.set(m));
        this.teams.get(s.teamId).subscribe((t) => this.skillsService.listByOrg(t.organizationId).subscribe((sk) => this.skills.set(sk)));
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
    this.loadShifts();
    this.loadRuns();
  }

  select(t: Tab): void {
    this.tab.set(t);
    if (t === 'insights' && !this.insights()) {
      this.loadInsights();
    }
  }

  loadShifts(): void {
    this.scheduling.shifts(this.scheduleId()).subscribe((s) => this.shifts.set(s));
  }
  loadRuns(): void {
    this.scheduling.runs(this.scheduleId()).subscribe((r) => this.runs.set(r));
  }

  memberName(id: string): string {
    return this.memberNames().get(id) ?? id;
  }
  skillName(id: string | null): string {
    return id ? (this.skills().find((s) => s.id === id)?.name ?? id) : 'Any';
  }

  // Matrix helpers ----------------------------------------------------------
  private dateList(start: string, end: string): string[] {
    const out: string[] = [];
    const d = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    while (d <= last) {
      out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  private initial(sh: ScheduledShift): string {
    return (sh.name ?? '?').charAt(0).toUpperCase();
  }
  weekday(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
  }
  dayNum(date: string): string {
    return date.slice(8, 10);
  }
  isWeekend(date: string): boolean {
    const day = new Date(`${date}T12:00:00`).getDay();
    return day === 0 || day === 6;
  }

  // Actions (unchanged behaviour) -------------------------------------------
  solve(): void {
    this.solving.set(true);
    this.solveStatus.set('queued');
    this.scheduling.solve(this.scheduleId()).subscribe((run) => this.poll(run.id));
  }
  private poll(runId: string): void {
    this.scheduling.run(runId).subscribe((run) => {
      this.solveStatus.set(run.status);
      if (run.status === 'succeeded' || run.status === 'failed') {
        this.solving.set(false);
        this.loadShifts();
        this.loadRuns();
        if (this.insights()) {
          this.loadInsights();
        }
        return;
      }
      setTimeout(() => this.poll(runId), 800);
    });
  }

  publish(): void {
    this.scheduling.publish(this.scheduleId()).subscribe((s) => this.schedule.set(s));
  }
  archive(): void {
    this.scheduling.archive(this.scheduleId()).subscribe((s) => this.schedule.set(s));
  }

  preview(): void {
    this.scheduling.preview(this.scheduleId(), Number(this.lambda)).subscribe((p) => this.previewResult.set(p));
  }
  summary(p: PreviewResult): string {
    return `${p.assignments.length} assignments\n${JSON.stringify(p.diagnostics, null, 2)}`;
  }

  loadInsights(): void {
    this.scheduling.insights(this.scheduleId()).subscribe((i) => this.insights.set(i));
  }

  applyRun(r: SolveRun): void {
    this.scheduling.applyRun(r.id).subscribe(() => this.loadShifts());
  }

  addShift(event: Event): void {
    event.preventDefault();
    this.error.set(null);
    this.scheduling.addShift(this.scheduleId(), { ...this.sh }).subscribe({
      next: () => {
        this.sh = { name: '', start_at: '', end_at: '', rest_hours_after: null };
        this.loadShifts();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  deleteShift(shift: ScheduledShift): void {
    this.scheduling.deleteShift(shift.id).subscribe(() => this.loadShifts());
  }

  regenerate(): void {
    this.scheduling.regenerate(this.scheduleId()).subscribe(() => this.loadShifts());
  }

  addReq(shift: ScheduledShift): void {
    this.error.set(null);
    this.scheduling
      .addRequirement(shift.id, {
        type: this.reqType[shift.id] ?? 'headcount',
        skill_id: this.reqSkill[shift.id] ?? null,
        count: this.reqCount[shift.id] ?? null,
      })
      .subscribe({ next: () => this.loadShifts(), error: (e) => this.error.set(errorMessage(e)) });
  }
  deleteReq(id: string): void {
    this.scheduling.deleteRequirement(id).subscribe(() => this.loadShifts());
  }

  assign(shift: ScheduledShift): void {
    const memberId = this.assignMember[shift.id];
    if (!memberId) return;
    this.error.set(null);
    this.scheduling.assign(shift.id, memberId).subscribe({
      next: () => {
        this.assignMember[shift.id] = null;
        this.loadShifts();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  unassign(shift: ScheduledShift, memberId: string): void {
    this.scheduling.unassign(shift.id, memberId).subscribe(() => this.loadShifts());
  }
  toggleLock(a: { id: string; locked: boolean }): void {
    this.scheduling.setLock(a.id, !a.locked).subscribe(() => this.loadShifts());
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

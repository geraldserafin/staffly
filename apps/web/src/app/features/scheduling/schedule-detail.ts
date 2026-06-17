import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-schedule-detail',
  imports: [FormsModule],
  template: `
    @if (schedule(); as s) {
      <h2>{{ s.name }} <small>{{ s.startDate }}→{{ s.endDate }} · {{ s.status }}</small></h2>

      <section>
        <button (click)="solve()" [disabled]="solving()">Solve (async)</button>
        <button (click)="publish()">Publish</button>
        <button (click)="archive()">Archive</button>
        @if (solveStatus()) {
          <span>solve: {{ solveStatus() }}</span>
        }
      </section>

      <section>
        <h3>Preview (live λ)</h3>
        <label>λ <input type="number" step="0.1" min="0" max="1" [(ngModel)]="lambda" name="lambda" /></label>
        <button (click)="preview()">Preview</button>
        @if (previewResult(); as p) {
          <pre>{{ summary(p) }}</pre>
        }
      </section>

      <section>
        <h3>Insights</h3>
        <button (click)="loadInsights()">Load insights</button>
        @if (insights(); as i) {
          <table border="1" cellpadding="3">
            <tr><th>member</th><th>shifts</th><th>hours</th><th>dissatisfaction</th></tr>
            @for (m of i.members; track m.memberId) {
              <tr><td>{{ m.name }}</td><td>{{ m.assignedShifts }}</td><td>{{ m.hours }}</td><td>{{ m.dissatisfaction ?? '—' }}</td></tr>
            }
          </table>
          <p>gaps: {{ i.staffingGaps.length }} · fairness max {{ i.fairness.maxDissatisfaction }} (from last solve: {{ i.fairness.fromLastSolve }})</p>
        }
      </section>

      <section>
        <h3>Solve runs</h3>
        <button (click)="loadRuns()">Refresh runs</button>
        <ul>
          @for (r of runs(); track r.id) {
            <li>
              {{ r.status }} · {{ r.createdAt }}
              @if (r.resultSnapshot) {
                ({{ r.resultSnapshot.length }} assignments)
                <button (click)="applyRun(r)">apply</button>
              }
            </li>
          } @empty {
            <li><em>No runs.</em></li>
          }
        </ul>
      </section>

      <section>
        <h3>Shifts</h3>
        <button (click)="regenerate()">Regenerate from templates</button>
        <small>(replaces template-generated shifts; keeps manual ones)</small>
        <form (submit)="addShift($event)">
          <input [(ngModel)]="sh.name" name="shName" placeholder="name" required />
          <input [(ngModel)]="sh.category" name="shCat" placeholder="category" />
          <input [(ngModel)]="sh.start_at" name="shStart" type="datetime-local" required />
          <input [(ngModel)]="sh.end_at" name="shEnd" type="datetime-local" required />
          <input [(ngModel)]="sh.rest_hours_after" name="shRest" type="number" placeholder="rest h" />
          <button type="submit">add shift</button>
        </form>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        @for (shift of shifts(); track shift.id) {
          <div class="shift" style="border:1px solid #ccc; margin:6px; padding:6px">
            <strong>{{ shift.name }}</strong> {{ shift.startAt }}→{{ shift.endAt }}
            <button (click)="deleteShift(shift)">delete shift</button>

            <div>
              requirements:
              <ul>
                @for (r of shift.requirements; track r.id) {
                  <li>
                    {{ r.type }} · {{ skillName(r.skillId) }} · {{ r.count ?? '—' }}
                    <button (click)="deleteReq(r.id)">x</button>
                  </li>
                }
              </ul>
              <select [(ngModel)]="reqType[shift.id]" [name]="'rt' + shift.id">
                <option value="headcount">headcount</option>
                <option value="coverage">coverage</option>
              </select>
              <select [(ngModel)]="reqSkill[shift.id]" [name]="'rs' + shift.id">
                <option [ngValue]="null">Any</option>
                @for (sk of skills(); track sk.id) {
                  <option [ngValue]="sk.id">{{ sk.name }}</option>
                }
              </select>
              <input [(ngModel)]="reqCount[shift.id]" [name]="'rc' + shift.id" type="number" placeholder="count" />
              <button (click)="addReq(shift)">+ req</button>
            </div>

            <div>
              assignments:
              <ul>
                @for (a of shift.assignments; track a.id) {
                  <li>
                    {{ memberName(a.memberId) }} {{ a.locked ? '🔒' : '' }}
                    <button (click)="toggleLock(a)">{{ a.locked ? 'unlock' : 'lock' }}</button>
                    <button (click)="unassign(shift, a.memberId)">remove</button>
                  </li>
                }
              </ul>
              <select [(ngModel)]="assignMember[shift.id]" [name]="'am' + shift.id">
                <option [ngValue]="null">— assign member —</option>
                @for (m of teamMembers(); track m.id) {
                  <option [ngValue]="m.id">{{ m.name }}</option>
                }
              </select>
              <button (click)="assign(shift)">assign</button>
            </div>
          </div>
        }
      </section>
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

  private readonly memberNames = computed(() => new Map(this.teamMembers().map((m) => [m.id, m.name])));

  lambda = 0.3;
  sh = { name: '', category: '', start_at: '', end_at: '', rest_hours_after: null as number | null };
  reqType: Record<string, RequirementType> = {};
  reqSkill: Record<string, string | null> = {};
  reqCount: Record<string, number | null> = {};
  assignMember: Record<string, string | null> = {};

  ngOnInit(): void {
    this.scheduling.get(this.scheduleId()).subscribe((s) => {
      this.schedule.set(s);
      this.teams.members(s.teamId).subscribe((m) => this.teamMembers.set(m));
      this.teams.get(s.teamId).subscribe((t) => this.skillsService.listByOrg(t.organizationId).subscribe((sk) => this.skills.set(sk)));
    });
    this.loadShifts();
    this.loadRuns();
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
        this.sh = { name: '', category: '', start_at: '', end_at: '', rest_hours_after: null };
        this.loadShifts();
      },
      error: (e) => this.error.set(e?.error?.message ?? 'Failed'),
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
      .subscribe({ next: () => this.loadShifts(), error: (e) => this.error.set(e?.error?.message ?? 'Failed') });
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
      error: (e) => this.error.set(e?.error?.message ?? 'Failed'),
    });
  }
  unassign(shift: ScheduledShift, memberId: string): void {
    this.scheduling.unassign(shift.id, memberId).subscribe(() => this.loadShifts());
  }
  toggleLock(a: { id: string; locked: boolean }): void {
    this.scheduling.setLock(a.id, !a.locked).subscribe(() => this.loadShifts());
  }
}

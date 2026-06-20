import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RequirementType, ShiftTemplate, Skill } from '../../core/models';
import { Icon } from '../../ui/icon';
import { SkillsService } from '../skills/skills.service';
import { ShiftTemplatesService } from './shift-templates.service';

function parseDays(csv: string): number[] | null {
  const days = csv
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !Number.isNaN(d));
  return days.length ? days : null;
}

@Component({
  selector: 'app-shift-templates-panel',
  imports: [FormsModule, Icon],
  template: `
    <header class="page-head">
      <div>
        <h2>Shift templates</h2>
        <p class="subtitle">Recurring demand definitions. Templates generate shifts when a schedule is created.</p>
      </div>
    </header>

    <section>
      <h3>New template</h3>
      <form (submit)="create($event)">
        <label>name <input [(ngModel)]="f.name" name="tName" placeholder="e.g. Morning" required /></label>
        <label>start <input [(ngModel)]="f.start_time" name="tStart" type="time" required /></label>
        <label>end <input [(ngModel)]="f.end_time" name="tEnd" type="time" required /></label>
        <label>rest (h) <input [(ngModel)]="f.rest" name="tRest" type="number" style="width:5rem" /></label>
        <label>frequency
          <select [(ngModel)]="f.freq" name="tFreq">
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
          </select>
        </label>
        <label>days <input [(ngModel)]="f.days" name="tDays" placeholder="1,2,3,4,5" style="width:8rem" /></label>
        <button type="submit" class="primary">Add template</button>
      </form>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </section>

    @for (t of templates(); track t.id) {
      <section>
        <div class="actions" style="justify-content:space-between;margin-bottom:.5rem">
          <div>
            <strong>{{ t.name }}</strong>
            <span class="muted" style="margin-left:.5rem">{{ t.startTime }}–{{ t.endTime }}</span>
          </div>
          <div class="actions">
            <span class="muted">{{ t.recurrenceFrequency }} [{{ t.recurrenceDays?.join(',') }}]</span>
            <button class="icon-btn" (click)="remove(t)" title="Delete template">
              <app-icon name="trash" [size]="16" />
            </button>
          </div>
        </div>

        <h3 style="font-size:.85rem;color:var(--muted-foreground);margin-bottom:.4rem">Requirements</h3>
        <ul>
          @for (r of t.requirements; track r.id) {
            <li>
              <span class="badge">{{ r.type }}</span>
              <span class="muted">skill {{ skillName(r.skillId) }}</span>
              <span class="muted">count {{ r.count ?? '—' }}</span>
              <span class="muted">days {{ r.days?.join(',') ?? 'all' }}</span>
              <button class="icon-btn" style="margin-left:auto" (click)="removeReq(t, r.id)" title="Remove">
                <app-icon name="x" [size]="15" />
              </button>
            </li>
          } @empty {
            <li class="empty">No requirements.</li>
          }
        </ul>
        <form (submit)="addReq($event, t)" class="actions" style="margin-top:.5rem">
          <select [(ngModel)]="reqType[t.id]" [name]="'rt' + t.id">
            <option value="headcount">headcount</option>
            <option value="coverage">coverage</option>
          </select>
          <select [(ngModel)]="reqSkill[t.id]" [name]="'rs' + t.id" style="min-width:9rem">
            <option [ngValue]="null">Any</option>
            @for (s of skills(); track s.id) {
              <option [ngValue]="s.id">{{ s.name }}</option>
            }
          </select>
          <input [(ngModel)]="reqCount[t.id]" [name]="'rc' + t.id" type="number" placeholder="count" style="width:5rem" />
          <input [(ngModel)]="reqDays[t.id]" [name]="'rd' + t.id" placeholder="days" style="width:7rem" />
          <button type="submit" class="primary sm">+ requirement</button>
        </form>
      </section>
    } @empty {
      <section><p class="empty">No templates yet — create one above.</p></section>
    }
  `,
})
export class ShiftTemplatesPanel {
  private readonly service = inject(ShiftTemplatesService);
  private readonly skillsService = inject(SkillsService);

  readonly orgId = input.required<string>();
  readonly templates = signal<ShiftTemplate[]>([]);
  readonly skills = signal<Skill[]>([]);
  readonly error = signal<string | null>(null);

  f = { name: '', start_time: '09:00', end_time: '17:00', rest: null as number | null, freq: 'weekly' as 'weekly' | 'monthly', days: '1,2,3,4,5' };
  reqType: Record<string, RequirementType> = {};
  reqSkill: Record<string, string | null> = {};
  reqCount: Record<string, number | null> = {};
  reqDays: Record<string, string> = {};

  ngOnInit(): void {
    this.load();
    this.skillsService.listByOrg(this.orgId()).subscribe((s) => this.skills.set(s));
  }

  load(): void {
    this.service.listByOrg(this.orgId()).subscribe((t) => this.templates.set(t));
  }

  skillName(id: string | null): string {
    return id ? (this.skills().find((s) => s.id === id)?.name ?? id) : 'Any';
  }

  create(event: Event): void {
    event.preventDefault();
    this.error.set(null);
    this.service
      .create(this.orgId(), {
        name: this.f.name.trim(),
        start_time: this.f.start_time,
        end_time: this.f.end_time,
        rest_hours_after: this.f.rest,
        recurrence_frequency: this.f.freq,
        recurrence_days: parseDays(this.f.days),
      })
      .subscribe({
        next: () => {
          this.f.name = '';
          this.load();
        },
        error: (e) => this.error.set(e?.error?.message ?? 'Failed'),
      });
  }

  remove(t: ShiftTemplate): void {
    this.service.remove(t.id).subscribe(() => this.load());
  }

  addReq(event: Event, t: ShiftTemplate): void {
    event.preventDefault();
    this.error.set(null);
    this.service
      .addRequirement(t.id, {
        type: this.reqType[t.id] ?? 'headcount',
        skill_id: this.reqSkill[t.id] ?? null,
        count: this.reqCount[t.id] ?? null,
        days: parseDays(this.reqDays[t.id] ?? ''),
      })
      .subscribe({
        next: () => this.load(),
        error: (e) => this.error.set(e?.error?.message ?? 'Failed'),
      });
  }

  removeReq(t: ShiftTemplate, requirementId: string): void {
    this.service.removeRequirement(requirementId).subscribe(() => this.load());
  }
}

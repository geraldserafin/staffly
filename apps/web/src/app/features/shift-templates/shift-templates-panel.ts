import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RequirementType, ShiftTemplate, Skill } from '../../core/models';
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
  imports: [FormsModule],
  template: `
    <section>
      <h3>Shift templates</h3>
      <form (submit)="create($event)">
        <input [(ngModel)]="f.name" name="tName" placeholder="Name" required />
        <input [(ngModel)]="f.category" name="tCat" placeholder="Category (day/night)" />
        <label>start <input [(ngModel)]="f.start_time" name="tStart" type="time" required /></label>
        <label>end <input [(ngModel)]="f.end_time" name="tEnd" type="time" required /></label>
        <input [(ngModel)]="f.rest" name="tRest" type="number" placeholder="rest h" />
        <select [(ngModel)]="f.freq" name="tFreq">
          <option value="weekly">weekly</option>
          <option value="monthly">monthly</option>
        </select>
        <input [(ngModel)]="f.days" name="tDays" placeholder="days e.g. 1,2,3" />
        <button type="submit">Add template</button>
      </form>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <ul>
        @for (t of templates(); track t.id) {
          <li>
            <strong>{{ t.name }}</strong>
            {{ t.startTime }}–{{ t.endTime }}
            <small>{{ t.recurrenceFrequency }} [{{ t.recurrenceDays?.join(',') }}]</small>
            <button (click)="remove(t)">delete</button>
            <ul>
              @for (r of t.requirements; track r.id) {
                <li>
                  {{ r.type }} · skill {{ skillName(r.skillId) }} · count {{ r.count ?? '—' }} ·
                  days {{ r.days?.join(',') ?? 'all' }}
                  <button (click)="removeReq(t, r.id)">x</button>
                </li>
              }
            </ul>
            <form (submit)="addReq($event, t)">
              <select [(ngModel)]="reqType[t.id]" [name]="'rt' + t.id">
                <option value="headcount">headcount</option>
                <option value="coverage">coverage</option>
              </select>
              <select [(ngModel)]="reqSkill[t.id]" [name]="'rs' + t.id">
                <option [ngValue]="null">Any</option>
                @for (s of skills(); track s.id) {
                  <option [ngValue]="s.id">{{ s.name }}</option>
                }
              </select>
              <input
                [(ngModel)]="reqCount[t.id]"
                [name]="'rc' + t.id"
                type="number"
                placeholder="count"
              />
              <input [(ngModel)]="reqDays[t.id]" [name]="'rd' + t.id" placeholder="days" />
              <button type="submit">+ requirement</button>
            </form>
          </li>
        } @empty {
          <li><em>No templates.</em></li>
        }
      </ul>
    </section>
  `,
})
export class ShiftTemplatesPanel {
  private readonly service = inject(ShiftTemplatesService);
  private readonly skillsService = inject(SkillsService);

  readonly orgId = input.required<string>();
  readonly templates = signal<ShiftTemplate[]>([]);
  readonly skills = signal<Skill[]>([]);
  readonly error = signal<string | null>(null);

  f = { name: '', category: '', start_time: '09:00', end_time: '17:00', rest: null as number | null, freq: 'weekly' as 'weekly' | 'monthly', days: '1,2,3,4,5' };
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
        category: this.f.category.trim() || null,
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

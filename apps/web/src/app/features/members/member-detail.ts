import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Availability,
  AvailabilityKind,
  Member,
  MemberPreference,
  PreferenceType,
  Skill,
} from '../../core/models';
import { AvailabilityService } from '../availability/availability.service';
import { PreferencesService } from '../preferences/preferences.service';
import { SkillsService } from '../skills/skills.service';
import { MembersService } from './members.service';

const PREFERENCE_TYPES: PreferenceType[] = [
  'preferred_shift_type',
  'hours_target',
  'weekend',
  'max_consecutive_days',
  'avoid_fast_rotation',
  'preferred_days_off',
];

@Component({
  selector: 'app-member-detail',
  imports: [FormsModule],
  template: `
    @if (member(); as m) {
      <h2>{{ m.name }}</h2>
      <label>
        priority
        <input type="number" [(ngModel)]="priority" name="priority" />
        <button (click)="savePriority()">save</button>
      </label>

      <section>
        <h3>Skills</h3>
        <ul>
          @for (s of mySkills(); track s.id) {
            <li>{{ s.name }} <button (click)="removeSkill(s)">remove</button></li>
          } @empty {
            <li><em>No skills.</em></li>
          }
        </ul>
        <select [(ngModel)]="skillToAdd" name="skillToAdd">
          <option [ngValue]="null">— add skill —</option>
          @for (s of assignableSkills(); track s.id) {
            <option [ngValue]="s.id">{{ s.name }}</option>
          }
        </select>
        <button (click)="addSkill()">add</button>
      </section>

      <section>
        <h3>Availability</h3>
        <ul>
          @for (a of availabilities(); track a.id) {
            <li>
              {{ a.kind }} ·
              {{ a.recurrence ? 'weekly [' + a.days?.join(',') + ']' : a.startAt + '→' + a.endAt }}
              {{ a.startTime }}{{ a.startTime ? '–' + a.endTime : '' }}
              {{ a.reason }}
              <button (click)="removeAvailability(a)">x</button>
            </li>
          } @empty {
            <li><em>No entries (defaults to available).</em></li>
          }
        </ul>
        <form (submit)="addAvailability($event)">
          <select [(ngModel)]="av.kind" name="avKind">
            <option value="available">available</option>
            <option value="unavailable">unavailable</option>
          </select>
          <label>recurring <input type="checkbox" [(ngModel)]="av.recurring" name="avRec" /></label>
          @if (av.recurring) {
            <input [(ngModel)]="av.days" name="avDays" placeholder="days 1-7 e.g. 6,7" />
            <input [(ngModel)]="av.startTime" name="avST" type="time" />
            <input [(ngModel)]="av.endTime" name="avET" type="time" />
          } @else {
            <input [(ngModel)]="av.startAt" name="avSA" type="datetime-local" />
            <input [(ngModel)]="av.endAt" name="avEA" type="datetime-local" />
          }
          <input [(ngModel)]="av.reason" name="avReason" placeholder="reason" />
          <button type="submit">add</button>
        </form>
      </section>

      <section>
        <h3>Preferences</h3>
        @if (prefError()) {
          <p class="error">{{ prefError() }}</p>
        }
        <ul>
          @for (p of preferences(); track p.id) {
            <li>
              <strong>{{ p.type }}</strong> · {{ asJson(p.params) }} · w{{ p.weight }} ·
              {{ p.mode }}{{ p.effectiveHard ? ' (hard ✓)' : p.mode === 'hard' ? ' (hard pending)' : '' }}
              @if (p.mode === 'hard' && !p.hardApproved) {
                <button (click)="approve(p)">approve hard</button>
              }
              @if (p.hardApproved) {
                <button (click)="revoke(p)">revoke hard</button>
              }
              <button (click)="removePref(p)">delete</button>
            </li>
          } @empty {
            <li><em>No preferences.</em></li>
          }
        </ul>
        <form (submit)="addPref($event)">
          <select [(ngModel)]="pf.type" name="pfType">
            @for (t of types; track t) {
              <option [ngValue]="t">{{ t }}</option>
            }
          </select>
          <input [(ngModel)]="pf.params" name="pfParams" placeholder='params JSON e.g. {{ "{" }}"target":40{{ "}" }}' />
          <input [(ngModel)]="pf.weight" name="pfWeight" type="number" min="1" max="5" />
          <select [(ngModel)]="pf.mode" name="pfMode">
            <option value="soft">soft</option>
            <option value="hard">hard (request)</option>
          </select>
          <button type="submit">add</button>
        </form>
      </section>
    }
  `,
})
export class MemberDetail {
  private readonly members = inject(MembersService);
  private readonly skillsService = inject(SkillsService);
  private readonly availabilityService = inject(AvailabilityService);
  private readonly preferencesService = inject(PreferencesService);

  readonly memberId = input.required<string>();
  readonly types = PREFERENCE_TYPES;

  readonly member = signal<Member | null>(null);
  readonly mySkills = signal<Skill[]>([]);
  readonly orgSkills = signal<Skill[]>([]);
  readonly availabilities = signal<Availability[]>([]);
  readonly preferences = signal<MemberPreference[]>([]);
  readonly prefError = signal<string | null>(null);

  readonly assignableSkills = computed(() => {
    const owned = new Set(this.mySkills().map((s) => s.id));
    return this.orgSkills().filter((s) => !owned.has(s.id));
  });

  priority = 1;
  skillToAdd: string | null = null;
  av = {
    kind: 'unavailable' as AvailabilityKind,
    recurring: false,
    days: '',
    startTime: '',
    endTime: '',
    startAt: '',
    endAt: '',
    reason: '',
  };
  pf = { type: 'hours_target' as PreferenceType, params: '', weight: 3, mode: 'soft' as 'soft' | 'hard' };

  ngOnInit(): void {
    this.members.get(this.memberId()).subscribe((m) => {
      this.member.set(m);
      this.priority = m.priority;
      this.skillsService.listByOrg(m.organizationId).subscribe((s) => this.orgSkills.set(s));
    });
    this.loadSkills();
    this.loadAvailability();
    this.loadPreferences();
  }

  private loadSkills(): void {
    this.skillsService.memberSkills(this.memberId()).subscribe((s) => this.mySkills.set(s));
  }
  private loadAvailability(): void {
    this.availabilityService.listByMember(this.memberId()).subscribe((a) => this.availabilities.set(a));
  }
  private loadPreferences(): void {
    this.preferencesService.listByMember(this.memberId()).subscribe((p) => this.preferences.set(p));
  }

  savePriority(): void {
    this.members.update(this.memberId(), { priority: Number(this.priority) }).subscribe((m) => this.member.set(m));
  }

  addSkill(): void {
    if (!this.skillToAdd) return;
    this.skillsService.assignToMember(this.memberId(), this.skillToAdd).subscribe(() => {
      this.skillToAdd = null;
      this.loadSkills();
    });
  }
  removeSkill(s: Skill): void {
    this.skillsService.removeFromMember(this.memberId(), s.id).subscribe(() => this.loadSkills());
  }

  addAvailability(event: Event): void {
    event.preventDefault();
    const a = this.av;
    const body = a.recurring
      ? {
          kind: a.kind,
          recurrence: 'weekly' as const,
          days: a.days.split(',').map((d) => parseInt(d.trim(), 10)).filter((d) => !Number.isNaN(d)),
          start_time: a.startTime || null,
          end_time: a.endTime || null,
        }
      : {
          kind: a.kind,
          recurrence: null,
          start_at: a.startAt || null,
          end_at: a.endAt || null,
        };
    this.availabilityService
      .create(this.memberId(), { ...body, reason: a.reason || null })
      .subscribe(() => this.loadAvailability());
  }
  removeAvailability(a: Availability): void {
    this.availabilityService.remove(a.id).subscribe(() => this.loadAvailability());
  }

  addPref(event: Event): void {
    event.preventDefault();
    this.prefError.set(null);
    let params: Record<string, unknown> | null = null;
    if (this.pf.params.trim()) {
      try {
        params = JSON.parse(this.pf.params);
      } catch {
        this.prefError.set('params must be valid JSON');
        return;
      }
    }
    this.preferencesService
      .create(this.memberId(), {
        type: this.pf.type,
        params,
        weight: Number(this.pf.weight),
        mode: this.pf.mode,
      })
      .subscribe({
        next: () => {
          this.pf.params = '';
          this.loadPreferences();
        },
        error: (e) => this.prefError.set(e?.error?.message ?? 'Failed'),
      });
  }
  approve(p: MemberPreference): void {
    this.preferencesService.approve(p.id).subscribe(() => this.loadPreferences());
  }
  revoke(p: MemberPreference): void {
    this.preferencesService.revoke(p.id).subscribe(() => this.loadPreferences());
  }
  removePref(p: MemberPreference): void {
    this.preferencesService.remove(p.id).subscribe(() => this.loadPreferences());
  }

  asJson(v: unknown): string {
    return v ? JSON.stringify(v) : '{}';
  }
}

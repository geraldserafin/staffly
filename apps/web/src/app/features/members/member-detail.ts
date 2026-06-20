import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  Availability,
  Member,
  MemberPreference,
  MemberShift,
  PreferenceType,
  ShiftTemplate,
  Skill,
  Team,
} from '../../core/models';
import { Auth } from '../../core/auth';
import { Icon } from '../../ui/icon';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { PrioritySlider } from '../../ui/priority-slider';
import { MemberCalendar } from './member-calendar';
import { AvailabilityService } from '../availability/availability.service';
import { PreferencesService } from '../preferences/preferences.service';
import { SkillsService } from '../skills/skills.service';
import { ShiftTemplatesService } from '../shift-templates/shift-templates.service';
import { TeamsService } from '../teams/teams.service';
import { MembersService } from './members.service';

interface PrefConfig {
  type: PreferenceType;
  label: string;
  hint: string;
  hasParams: boolean;
}

const PREF_CONFIGS: PrefConfig[] = [
  {
    type: 'preferred_shift_type',
    label: 'Preferred shifts',
    hint: 'The solver tries to assign the member to shifts from these shift templates.',
    hasParams: true,
  },
  {
    type: 'hours_target',
    label: 'Hours target',
    hint: 'Aims to schedule the member for approximately this many hours per period.',
    hasParams: true,
  },
  {
    type: 'weekend',
    label: 'Weekend preference',
    hint: 'Controls whether the member gets more or fewer weekend shifts.',
    hasParams: true,
  },
  {
    type: 'max_consecutive_days',
    label: 'Max consecutive days',
    hint: 'Limits how many days in a row the member can be scheduled without a break.',
    hasParams: true,
  },
  {
    type: 'avoid_fast_rotation',
    label: 'Avoid fast rotation',
    hint: 'Keeps the member on the same shift pattern instead of rotating frequently.',
    hasParams: false,
  },
  {
    type: 'preferred_days_off',
    label: 'Preferred days off',
    hint: 'The solver avoids scheduling the member on the selected weekdays.',
    hasParams: true,
  },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

@Component({
  selector: 'app-member-detail',
  imports: [FormsModule, RouterLink, Icon, ConfirmDialog, PrioritySlider, MemberCalendar],
  template: `
    <nav class="breadcrumb">
      <a routerLink="../.." [relativeTo]="route">Members</a>
      <span class="sep">/</span>
      <span class="current">{{ member()?.name ?? 'Member' }}</span>
    </nav>

    @if (member(); as m) {
      <!-- Hero -->
      <header class="hero">
        <div class="hero-avatar">{{ initials(m.name) }}</div>
        <div class="hero-info">
          <h2>{{ m.name }}</h2>
          <p class="subtitle">
            {{ m.email ?? 'No email' }}
            @if (m.invitationAcceptedAt) {
              · <span class="status-active">Active</span>
            } @else {
              · <span class="status-pending">Pending invitation</span>
            }
          </p>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat-value">{{ m.priority }}</span>
            <span class="hero-stat-label">Priority</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-value">{{ upcomingShifts().length }}</span>
            <span class="hero-stat-label">Upcoming</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-value">{{ currentTeams().length }}</span>
            <span class="hero-stat-label">Teams</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-value">{{ mySkills().length }}</span>
            <span class="hero-stat-label">Skills</span>
          </div>
        </div>
      </header>

      <!-- Tabs -->
      <nav class="tab-bar">
        <button class="tab" [class.active]="activeTab() === 'calendar'" (click)="activeTab.set('calendar')">
          <app-icon name="calendar" [size]="15" /> Calendar
        </button>
        <button class="tab" [class.active]="activeTab() === 'preferences'" (click)="activeTab.set('preferences')">
          <app-icon name="sliders" [size]="15" /> Preferences
        </button>
        <button class="tab" [class.active]="activeTab() === 'settings'" (click)="activeTab.set('settings')">
          <app-icon name="settings" [size]="15" /> Settings
        </button>
      </nav>

      @switch (activeTab()) {
        <!-- ============ CALENDAR ============ -->
        @case ('calendar') {
          <section class="tab-pane">
            <app-member-calendar [shifts]="shifts()" [availabilities]="availabilities()" />
          </section>

          <section class="tab-pane">
            <h3>Upcoming shifts</h3>
            <div class="shift-list">
              @for (s of upcomingShifts(); track s.shiftId) {
                <div class="shift-row">
                  <div class="shift-when">
                    <span class="shift-date">{{ formatDate(s.startAt) }}</span>
                    <span class="shift-time">{{ formatTime(s.startAt) }}–{{ formatTime(s.endAt) }}</span>
                  </div>
                  <div class="shift-meta">
                    <span class="shift-name">{{ s.shiftName }}</span>
                    <span class="muted">{{ s.teamName }}</span>
                  </div>
                  @if (s.locked) {
                    <app-icon name="lock" [size]="13" class="shift-lock" />
                  }
                </div>
              } @empty {
                <p class="muted">No upcoming shifts scheduled.</p>
              }
            </div>
          </section>
        }

        <!-- ============ PREFERENCES ============ -->
        @case ('preferences') {
          <section class="tab-pane">
            <div class="config-section">
              <div class="config-section-head">
                <span class="config-section-title">Priority</span>
                <span class="config-section-hint">Higher priority members get scheduled first</span>
              </div>
              <app-priority-slider [value]="priority()" (valueChange)="onPriorityChange($event)" />
            </div>

            <div class="config-section">
              <div class="config-section-head">
                <span class="config-section-title">Preferences</span>
                <span class="config-section-hint">Toggle and customize scheduling rules</span>
              </div>

              <div class="pref-list">
                @for (item of prefList(); track item.cfg.type) {
                  <div class="pref-row" [class.disabled]="!item.pref" [class.open]="item.pref && expandedType() === item.cfg.type">
                    <div
                      class="pref-main"
                      [class.clickable]="!!item.pref"
                      (click)="item.pref && toggleExpand(item.cfg.type)"
                    >
                      @if (item.pref) {
                        <app-icon name="chevron-right" [size]="14" class="pref-caret" />
                      }
                      <span class="pref-label">{{ item.cfg.label }}</span>

                      @if (item.pref && expandedType() !== item.cfg.type) {
                        <span class="pref-summary" [class.enforced]="item.pref.mode === 'hard'">{{ prefSummary(item) }}</span>
                      }

                      <button
                        class="toggle-switch"
                        [class.on]="!!item.pref"
                        (click)="$event.stopPropagation(); item.pref ? togglePref(item.pref) : enablePref(item.cfg.type)"
                        [title]="item.pref ? 'Disable' : 'Enable'"
                      >
                        <span class="toggle-knob"></span>
                      </button>
                    </div>

                    @if (item.pref && expandedType() === item.cfg.type) {
                      <div class="pref-detail">
                        <p class="pref-hint">{{ item.cfg.hint }}</p>

                        @switch (item.cfg.type) {
                          @case ('preferred_shift_type') {
                            @if (shiftTemplates().length) {
                              <div class="template-picker">
                                @for (tpl of shiftTemplates(); track tpl.id) {
                                  <button
                                    type="button"
                                    class="day-chip"
                                    [class.active]="hasShift(item.pref, tpl.id)"
                                    (click)="toggleShift(item.pref, tpl.id)"
                                  >{{ tpl.name }}</button>
                                }
                              </div>
                            } @else {
                              <p class="pref-hint">No shift templates defined for this organization yet.</p>
                            }
                          }
                          @case ('hours_target') {
                            <input
                              type="number"
                              min="1"
                              [value]="getParam(item.pref, 'target', 0)"
                              (input)="setParam(item.pref, 'target', parseInt($any($event.target).value))"
                              placeholder="Target hours / period"
                            />
                          }
                          @case ('weekend') {
                            <div class="seg-control">
                              <button type="button" [class.active]="getParam(item.pref, 'mode', '') === 'prefer'" (click)="setParam(item.pref, 'mode', 'prefer')">Prefer</button>
                              <button type="button" [class.active]="getParam(item.pref, 'mode', '') === 'avoid'" (click)="setParam(item.pref, 'mode', 'avoid')">Avoid</button>
                            </div>
                          }
                          @case ('max_consecutive_days') {
                            <input
                              type="number"
                              min="1"
                              [value]="getParam(item.pref, 'max', 0)"
                              (input)="setParam(item.pref, 'max', parseInt($any($event.target).value))"
                              placeholder="Max consecutive days"
                            />
                          }
                          @case ('preferred_days_off') {
                            <div class="weekday-picker">
                              @for (d of weekdayOptions; track d.value) {
                                <button type="button" class="day-chip" [class.active]="hasDay(item.pref, d.value)" (click)="toggleDay(item.pref, d.value)">{{ d.label }}</button>
                              }
                            </div>
                          }
                        }

                        <div class="importance-row">
                          <span class="importance-label">Importance</span>
                          <div class="importance-axis">
                            @for (w of weightOptions; track w.value) {
                              <button
                                type="button"
                                class="imp-notch"
                                [class.active]="item.pref.mode !== 'hard' && item.pref.weight === w.value"
                                [disabled]="item.pref.mode === 'hard'"
                                (click)="setWeight(item.pref, w.value)"
                              >{{ w.label }}</button>
                            }
                            <button
                              type="button"
                              class="imp-notch enforce"
                              [class.active]="item.pref.mode === 'hard'"
                              [disabled]="!canApprove() && item.pref.mode === 'hard'"
                              (click)="toggleEnforce(item.pref)"
                            >Enforce</button>
                          </div>
                        </div>

                        @if (canApprove() && item.pref.mode === 'hard' && !item.pref.hardApproved) {
                          <button class="primary sm" (click)="approvePref(item.pref)">Approve enforcement</button>
                        }
                        @if (canApprove() && item.pref.hardApproved) {
                          <button class="sm" (click)="revokePref(item.pref)">Revoke enforcement</button>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </section>
        }

        <!-- ============ SETTINGS ============ -->
        @case ('settings') {
          <section class="tab-pane">
            <div class="config-section">
              <div class="config-section-head">
                <span class="config-section-title">Profile</span>
                <span class="config-section-hint">Member's personal details</span>
              </div>
              <div class="field">
                <label>Name</label>
                <div class="field-inline">
                  <input type="text" [(ngModel)]="nameDraft" name="nameDraft" placeholder="Member name" />
                  <button class="primary sm" (click)="saveName()" [disabled]="!nameDirty()">Save</button>
                </div>
              </div>
              <div class="field">
                <label>Email</label>
                <div class="field-locked">
                  <span>{{ m.email ?? 'No email' }}</span>
                  <app-icon name="lock" [size]="13" />
                  <span class="field-note">Set via invitation</span>
                </div>
              </div>
            </div>

            <div class="config-section">
              <div class="config-section-head">
                <span class="config-section-title">Teams</span>
                <span class="config-section-hint">Teams this member belongs to</span>
              </div>
              <div class="badge-row">
                @for (t of currentTeams(); track t.id) {
                  <span class="team-badge">
                    {{ t.name }}
                    <button class="badge-remove" (click)="confirmRemoveTeam(t)" title="Remove from team">
                      <app-icon name="x" [size]="12" />
                    </button>
                  </span>
                } @empty {
                  <span class="muted">Not assigned to any team.</span>
                }
                @if (assignableTeams().length > 0) {
                  <button class="add-badge-btn" (click)="showTeamModal.set(true)">
                    <app-icon name="plus" [size]="14" /> Assign team
                  </button>
                }
              </div>
            </div>

            <div class="config-section">
              <div class="config-section-head">
                <span class="config-section-title">Skills</span>
                <span class="config-section-hint">Skills this member can cover</span>
              </div>
              <div class="badge-row">
                @for (s of mySkills(); track s.id) {
                  <span class="skill-badge">
                    {{ s.name }}
                    <button class="badge-remove" (click)="removeSkill(s)" title="Remove skill">
                      <app-icon name="x" [size]="12" />
                    </button>
                  </span>
                } @empty {
                  <span class="muted">No skills assigned.</span>
                }
                @if (assignableSkills().length > 0) {
                  <select [(ngModel)]="skillToAdd" name="skillToAdd" (change)="addSkill()" class="skill-select">
                    <option [ngValue]="null">+ Add skill</option>
                    @for (s of assignableSkills(); track s.id) {
                      <option [ngValue]="s.id">{{ s.name }}</option>
                    }
                  </select>
                }
              </div>
            </div>

            <div class="danger-zone">
              <div class="config-section-head">
                <span class="config-section-title">Danger zone</span>
                <span class="config-section-hint">Removing a member cannot be undone</span>
              </div>
              <div class="danger-row">
                <div>
                  <span class="danger-title">Remove member</span>
                  <span class="config-section-hint">Permanently remove {{ m.name }} from this organization.</span>
                </div>
                <button class="danger" (click)="showDeleteDialog.set(true)">
                  <app-icon name="trash" [size]="15" /> Remove member
                </button>
              </div>
            </div>
          </section>
        }
      }
    }

    <!-- Assign team modal -->
    @if (showTeamModal()) {
      <div class="modal-overlay" (click)="showTeamModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Assign to team</h3>
            <button class="icon-btn" (click)="showTeamModal.set(false)" title="Close">
              <app-icon name="x" [size]="18" />
            </button>
          </div>
          <div class="modal-body">
            <div class="checkbox-list">
              @for (t of assignableTeams(); track t.id) {
                <div class="checkbox-row" [class.checked]="pendingTeamIds().has(t.id)" (click)="togglePendingTeam(t.id)">
                  <span class="check-box">
                    @if (pendingTeamIds().has(t.id)) {
                      <app-icon name="check" [size]="12" />
                    }
                  </span>
                  <span>{{ t.name }}</span>
                </div>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="ghost" (click)="showTeamModal.set(false)">Cancel</button>
            <button type="button" class="primary" (click)="assignTeams()" [disabled]="pendingTeamIds().size === 0">
              Assign to {{ pendingTeamIds().size }} team{{ pendingTeamIds().size === 1 ? '' : 's' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Confirm dialogs -->
    @if (showDeleteDialog()) {
      <app-confirm-dialog
        title="Remove member"
        message="Are you sure you want to remove {{ member()?.name }} from this organization? This cannot be undone."
        actionLabel="Remove member"
        (confirmed)="deleteMember()"
        (cancelled)="showDeleteDialog.set(false)"
      />
    }

    @if (showRemoveTeamDialog(); as rt) {
      <app-confirm-dialog
        title="Remove from team"
        message="Remove {{ member()?.name }} from {{ rt.name }}?"
        actionLabel="Remove"
        (confirmed)="doRemoveTeam(rt)"
        (cancelled)="showRemoveTeamDialog.set(null)"
      />
    }
  `,
  styles: [
    `
      .status-active {
        color: hsl(142 65% 65%);
        font-weight: 500;
      }
      .status-pending {
        color: hsl(45 85% 70%);
        font-weight: 500;
      }

      /* Hero */
      .hero {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.1rem 1.25rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--card, var(--background));
        margin-bottom: 1rem;
      }
      .hero-avatar {
        display: grid;
        place-items: center;
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        background: var(--primary-faded, var(--muted));
        color: var(--primary);
        font-weight: 600;
        font-size: 1.05rem;
        flex-shrink: 0;
      }
      .hero-info {
        min-width: 0;
      }
      .hero-info h2 {
        margin: 0;
        font-size: 1.2rem;
      }
      .hero-info .subtitle {
        margin: 0.15rem 0 0;
        font-size: 0.85rem;
        color: var(--muted-foreground);
      }
      .hero-stats {
        display: flex;
        gap: 1.5rem;
        margin-left: auto;
        padding-left: 1rem;
      }
      .hero-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.1rem;
      }
      .hero-stat-value {
        font-size: 1.25rem;
        font-weight: 600;
      }
      .hero-stat-label {
        font-size: 0.72rem;
        color: var(--muted-foreground);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      /* Tabs */
      .tab-bar {
        display: flex;
        gap: 0.25rem;
        border-bottom: 1px solid var(--border);
        margin-bottom: 1.25rem;
      }
      .tab {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.55rem 0.9rem;
        border: 0;
        background: transparent;
        color: var(--muted-foreground);
        font-size: 0.88rem;
        font-weight: 500;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
      }
      .tab:hover {
        color: var(--foreground);
      }
      .tab.active {
        color: var(--foreground);
        border-bottom-color: var(--primary);
      }
      .tab-pane {
        margin-bottom: 1.5rem;
      }

      /* Settings fields */
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 0.85rem;
      }
      .field > label {
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--muted-foreground);
      }
      .field-inline {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .field-inline input {
        flex: 1;
      }
      .field-locked {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.45rem 0.65rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--muted);
        color: var(--muted-foreground);
        font-size: 0.85rem;
      }
      .field-note {
        margin-left: auto;
        font-size: 0.74rem;
        opacity: 0.8;
      }

      /* Danger zone */
      .danger-zone {
        margin-top: 1.5rem;
        padding: 1rem;
        border: 1px solid color-mix(in oklab, var(--destructive), transparent 60%);
        border-radius: var(--radius);
        background: color-mix(in oklab, var(--destructive), transparent 92%);
      }
      .danger-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 0.75rem;
      }
      .danger-row > div {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      .danger-title {
        font-size: 0.85rem;
        font-weight: 500;
      }

      /* Upcoming shifts */
      .shift-list {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .shift-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.55rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--background);
      }
      .shift-when {
        display: flex;
        flex-direction: column;
        min-width: 7rem;
      }
      .shift-date {
        font-size: 0.85rem;
        font-weight: 500;
      }
      .shift-time {
        font-size: 0.76rem;
        color: var(--muted-foreground);
      }
      .shift-meta {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
      }
      .shift-name {
        font-size: 0.85rem;
        font-weight: 500;
      }
      .shift-meta .muted {
        font-size: 0.76rem;
      }
      .shift-lock {
        margin-left: auto;
        color: var(--muted-foreground);
      }

      /* Badge rows */
      .badge-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
      }
      .team-badge,
      .skill-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.3rem 0.6rem;
        border-radius: 1rem;
        font-size: 0.82rem;
        font-weight: 500;
        background: var(--muted);
        border: 1px solid var(--border);
      }
      .team-badge {
        background: var(--primary-faded);
        border-color: color-mix(in oklab, var(--primary), transparent 70%);
        color: color-mix(in oklab, var(--primary), white 20%);
      }
      .badge-remove {
        display: grid;
        place-items: center;
        width: 1.1rem;
        height: 1.1rem;
        border-radius: 50%;
        border: 0;
        background: transparent;
        color: inherit;
        opacity: 0.6;
        cursor: pointer;
        padding: 0;
      }
      .badge-remove:hover {
        opacity: 1;
        background: color-mix(in oklab, var(--destructive), transparent 85%);
        color: var(--destructive);
      }
      .add-badge-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.3rem 0.6rem;
        border-radius: 1rem;
        font-size: 0.82rem;
        font-weight: 500;
        border: 1px dashed var(--border);
        background: transparent;
        color: var(--muted-foreground);
        cursor: pointer;
      }
      .add-badge-btn:hover {
        border-color: var(--primary);
        color: var(--primary);
      }
      .skill-select {
        padding: 0.25rem 0.5rem;
        font-size: 0.82rem;
        border-radius: 1rem;
        width: auto;
        min-width: 8rem;
      }

      .config-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .config-section-head {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
      }
      .config-section-title {
        font-size: 0.92rem;
        font-weight: 600;
      }
      .config-section-hint {
        font-size: 0.78rem;
        color: var(--muted-foreground);
      }

      /* Preferences — compact rows */
      .pref-list {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .pref-row {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--background);
      }
      .pref-row.disabled {
        opacity: 0.6;
      }
      .pref-main {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.65rem;
      }
      .pref-main.clickable {
        cursor: pointer;
      }
      .pref-main.clickable:hover {
        background: var(--muted);
        border-radius: var(--radius-sm);
      }
      .pref-caret {
        color: var(--muted-foreground);
        flex-shrink: 0;
        transition: transform 0.15s;
      }
      .pref-row.open .pref-caret {
        transform: rotate(90deg);
      }
      .pref-label {
        font-size: 0.85rem;
        font-weight: 500;
      }
      .pref-summary {
        margin-left: auto;
        font-size: 0.78rem;
        color: var(--muted-foreground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 14rem;
      }
      .pref-summary.enforced {
        color: var(--primary);
        font-weight: 500;
      }
      .pref-main .toggle-switch {
        margin-left: auto;
      }
      .pref-summary + .toggle-switch {
        margin-left: 0.6rem;
      }

      /* Toggle switch */
      .toggle-switch {
        width: 2rem;
        height: 1.15rem;
        border-radius: 1rem;
        border: 0;
        background: var(--muted);
        position: relative;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
        transition: background 0.15s;
      }
      .toggle-switch.on {
        background: var(--primary);
      }
      .toggle-knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: calc(1.15rem - 4px);
        height: calc(1.15rem - 4px);
        border-radius: 50%;
        background: white;
        transition: transform 0.15s;
      }
      .toggle-switch.on .toggle-knob {
        transform: translateX(0.85rem);
      }

      /* Info icon + tooltip */
      .info-icon {
        position: relative;
        display: inline-flex;
        align-items: center;
        color: var(--muted-foreground);
        cursor: help;
        flex-shrink: 0;
      }
      .info-icon:hover {
        color: var(--foreground);
      }
      .info-tooltip {
        position: absolute;
        bottom: calc(100% + 0.4rem);
        left: 50%;
        transform: translateX(-50%);
        background: var(--popover);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0.4rem 0.6rem;
        font-size: 0.76rem;
        font-weight: 400;
        color: var(--foreground);
        white-space: normal;
        width: 16rem;
        box-shadow: var(--shadow-pop);
        z-index: 50;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s;
      }
      .info-icon:hover .info-tooltip {
        opacity: 1;
      }

      /* Enforce checkbox */
      .enforce-check {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.78rem;
        color: var(--muted-foreground);
        cursor: pointer;
        white-space: nowrap;
        margin: 0;
      }
      .enforce-check.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .enforce-check input[type='checkbox'] {
        accent-color: var(--primary);
        width: 0.9rem;
        height: 0.9rem;
        margin: 0;
        flex-shrink: 0;
      }

      /* Expandable detail */
      .pref-detail {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.6rem;
        padding: 0.65rem;
        border-top: 1px solid var(--border);
      }
      .pref-detail input {
        width: 100%;
      }
      .pref-hint {
        margin: 0;
        font-size: 0.76rem;
        line-height: 1.3;
        color: var(--muted-foreground);
      }
      .pref-field input {
        width: 100%;
      }

      /* Segmented control */
      .seg-control {
        display: inline-flex;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }
      .seg-control button {
        border: 0;
        border-radius: 0;
        background: transparent;
        padding: 0.3rem 0.6rem;
        font-size: 0.78rem;
        color: var(--muted-foreground);
        cursor: pointer;
      }
      .seg-control button.active {
        background: var(--primary);
        color: var(--primary-foreground);
      }

      /* Weekday picker */
      .weekday-picker,
      .template-picker {
        display: flex;
        gap: 0.2rem;
        flex-wrap: wrap;
      }
      .day-chip {
        padding: 0.25rem 0.45rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.74rem;
        font-weight: 500;
        background: transparent;
        color: var(--muted-foreground);
        cursor: pointer;
        min-width: 2.3rem;
        text-align: center;
      }
      .day-chip.active {
        background: var(--primary);
        border-color: var(--primary);
        color: var(--primary-foreground);
      }

      /* Importance axis (weight + enforce merged) */
      .importance-row {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .importance-label {
        font-size: 0.74rem;
        font-weight: 500;
        color: var(--muted-foreground);
      }
      .importance-axis {
        display: flex;
        align-items: stretch;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }
      .imp-notch {
        flex: 1;
        padding: 0.3rem 0.35rem;
        border: 0;
        border-right: 1px solid var(--border);
        border-radius: 0;
        font-size: 0.72rem;
        font-weight: 500;
        background: transparent;
        color: var(--muted-foreground);
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.12s;
      }
      .imp-notch:hover:not(:disabled):not(.active) {
        background: var(--muted);
      }
      .imp-notch:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }
      .imp-notch.active {
        background: var(--primary);
        color: var(--primary-foreground);
      }
      .imp-notch.enforce {
        border-right: 0;
        flex: 0 0 auto;
        padding: 0.3rem 0.6rem;
        border-left: 1px dashed var(--border);
        color: var(--foreground);
      }
      .imp-notch.enforce.active {
        background: var(--primary);
        color: var(--primary-foreground);
      }

      /* Checkbox list (team modal) */
      .checkbox-list {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .checkbox-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
        padding: 0.45rem 0.5rem;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 0.88rem;
      }
      .checkbox-row:hover {
        background: var(--accent);
      }
      .check-box {
        flex-shrink: 0;
        width: 1rem;
        height: 1rem;
        border: 2px solid var(--border);
        border-radius: 0.25rem;
        background: var(--background);
        display: grid;
        place-items: center;
        color: var(--primary-foreground);
      }
      .checkbox-row.checked .check-box {
        border-color: var(--primary);
        background: var(--primary);
      }
    `,
  ],
})
export class MemberDetail {
  private readonly members = inject(MembersService);
  private readonly skillsService = inject(SkillsService);
  private readonly shiftTemplatesService = inject(ShiftTemplatesService);
  private readonly availabilityService = inject(AvailabilityService);
  private readonly preferencesService = inject(PreferencesService);
  private readonly teamsService = inject(TeamsService);
  private readonly auth = inject(Auth);
  readonly route = inject(ActivatedRoute);

  readonly memberId = input.required<string>();

  readonly member = signal<Member | null>(null);
  readonly priority = signal(1);
  readonly orgId = signal<string | null>(null);
  readonly shifts = signal<MemberShift[]>([]);
  readonly availabilities = signal<Availability[]>([]);
  readonly mySkills = signal<Skill[]>([]);
  readonly orgSkills = signal<Skill[]>([]);
  readonly preferences = signal<MemberPreference[]>([]);
  readonly shiftTemplates = signal<ShiftTemplate[]>([]);

  readonly orgTeams = signal<Team[]>([]);
  readonly memberTeamIds = signal<Set<string>>(new Set());

  readonly activeTab = signal<'calendar' | 'preferences' | 'settings'>('calendar');
  readonly expandedType = signal<PreferenceType | null>(null);
  readonly nameDraft = signal('');
  readonly showTeamModal = signal(false);
  readonly showDeleteDialog = signal(false);
  readonly showRemoveTeamDialog = signal<Team | null>(null);
  readonly pendingTeamIds = signal<Set<string>>(new Set());

  readonly prefConfigs = PREF_CONFIGS;
  readonly weightOptions = [
    { value: 1, label: 'Nice to have' },
    { value: 2, label: 'Slightly' },
    { value: 3, label: 'Important' },
    { value: 4, label: 'Very' },
    { value: 5, label: 'Critical' },
  ];
  readonly weekdayOptions = WEEKDAYS.map((label, i) => ({ label, value: i + 1 }));

  skillToAdd: string | null = null;

  readonly canApprove = computed(() => {
    const oid = this.orgId();
    if (!oid) return false;
    return this.auth.can('members.update', oid);
  });

  readonly currentTeams = computed(() =>
    this.orgTeams().filter((t) => this.memberTeamIds().has(t.id)),
  );
  readonly assignableTeams = computed(() =>
    this.orgTeams().filter((t) => !this.memberTeamIds().has(t.id)),
  );
  readonly assignableSkills = computed(() => {
    const owned = new Set(this.mySkills().map((s) => s.id));
    return this.orgSkills().filter((s) => !owned.has(s.id));
  });

  readonly prefMap = computed(() => {
    const map: Partial<Record<PreferenceType, MemberPreference>> = {};
    for (const p of this.preferences()) {
      map[p.type] = p;
    }
    return map;
  });

  readonly prefList = computed(() =>
    this.prefConfigs.map((cfg) => ({
      cfg,
      pref: this.prefMap()[cfg.type] ?? null,
    })),
  );

  readonly upcomingShifts = computed(() => {
    const now = Date.now();
    return this.shifts()
      .filter((s) => new Date(s.endAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  });

  readonly nameDirty = computed(() => {
    const draft = this.nameDraft().trim();
    return draft.length > 0 && draft !== this.member()?.name;
  });

  ngOnInit(): void {
    this.members.get(this.memberId()).subscribe((m) => {
      this.member.set(m);
      this.priority.set(m.priority);
      this.nameDraft.set(m.name);
      this.orgId.set(m.organizationId);
      this.skillsService.listByOrg(m.organizationId).subscribe((s) => this.orgSkills.set(s));
      this.shiftTemplatesService.listByOrg(m.organizationId).subscribe((t) => this.shiftTemplates.set(t));
      this.loadMemberTeams(m.organizationId);
    });
    this.loadSkills();
    this.loadAvailability();
    this.loadPreferences();
    this.loadShifts();
  }

  private loadShifts(): void {
    this.members.shifts(this.memberId()).subscribe((s) => this.shifts.set(s ?? []));
  }

  private loadSkills(): void {
    this.skillsService.memberSkills(this.memberId()).subscribe((s) => this.mySkills.set(s ?? []));
  }
  private loadAvailability(): void {
    this.availabilityService.listByMember(this.memberId()).subscribe((a) => this.availabilities.set(a ?? []));
  }
  private loadPreferences(): void {
    this.preferencesService.listByMember(this.memberId()).subscribe((p) => this.preferences.set(p ?? []));
  }

  private loadMemberTeams(orgId: string): void {
    this.teamsService.listByOrg(orgId).subscribe((teams) => {
      this.orgTeams.set(teams);
      if (teams.length === 0) return;
      forkJoin(teams.map((t) => this.teamsService.members(t.id))).subscribe((membersPerTeam) => {
        const onTeams = new Set<string>();
        membersPerTeam.forEach((members, i) => {
          if (members.some((m) => m.id === this.memberId())) {
            onTeams.add(teams[i].id);
          }
        });
        this.memberTeamIds.set(onTeams);
      });
    });
  }

  // Profile
  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  saveName(): void {
    const name = this.nameDraft().trim();
    if (!name || name === this.member()?.name) return;
    this.members.update(this.memberId(), { name }).subscribe((m) => {
      this.member.set(m);
      this.nameDraft.set(m.name);
    });
  }

  // Priority
  onPriorityChange(value: number): void {
    this.priority.set(value);
    this.members.update(this.memberId(), { priority: value }).subscribe((m) => this.member.set(m));
  }

  // Teams
  togglePendingTeam(id: string): void {
    const next = new Set(this.pendingTeamIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.pendingTeamIds.set(next);
  }

  assignTeams(): void {
    const ids = [...this.pendingTeamIds()];
    if (ids.length === 0) return;
    forkJoin(ids.map((id) => this.teamsService.attachMember(id, this.memberId()))).subscribe(() => {
      this.memberTeamIds.update((s) => {
        const next = new Set(s);
        ids.forEach((id) => next.add(id));
        return next;
      });
      this.pendingTeamIds.set(new Set());
      this.showTeamModal.set(false);
    });
  }

  confirmRemoveTeam(t: Team): void {
    this.showRemoveTeamDialog.set(t);
  }

  doRemoveTeam(t: Team): void {
    this.teamsService.detachMember(t.id, this.memberId()).subscribe(() => {
      this.memberTeamIds.update((s) => {
        const next = new Set(s);
        next.delete(t.id);
        return next;
      });
      this.showRemoveTeamDialog.set(null);
    });
  }

  // Skills
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

  // Preferences
  toggleExpand(type: PreferenceType): void {
    this.expandedType.update((cur) => (cur === type ? null : type));
  }

  weightLabel(weight: number): string {
    return this.weightOptions.find((w) => w.value === weight)?.label ?? '';
  }

  private prefShiftIds(p: MemberPreference): string[] {
    return ((p.params as Record<string, unknown>)?.['shiftIds'] as string[] | undefined) ?? [];
  }

  hasShift(p: MemberPreference, id: string): boolean {
    return this.prefShiftIds(p).includes(id);
  }

  toggleShift(p: MemberPreference, id: string): void {
    const ids = [...this.prefShiftIds(p)];
    const idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(id);
    this.setParam(p, 'shiftIds', ids);
  }

  prefSummary(item: { cfg: PrefConfig; pref: MemberPreference | null }): string {
    const p = item.pref;
    if (!p) return '';

    let value = '';
    switch (item.cfg.type) {
      case 'preferred_shift_type': {
        const names = this.prefShiftIds(p)
          .map((id) => this.shiftTemplates().find((t) => t.id === id)?.name)
          .filter(Boolean);
        value = names.length ? names.join(', ') : 'none';
        break;
      }
      case 'hours_target':
        value = `${this.getParam(p, 'target', 0)}h`;
        break;
      case 'weekend':
        value = this.getParam(p, 'mode', '') === 'prefer' ? 'Prefer' : 'Avoid';
        break;
      case 'max_consecutive_days':
        value = `${this.getParam(p, 'max', 0)} days`;
        break;
      case 'preferred_days_off': {
        const days = ((p.params as Record<string, unknown>)?.['days'] as number[] | undefined) ?? [];
        value = days.length
          ? days.map((d) => this.weekdayOptions.find((w) => w.value === d)?.label).join(', ')
          : 'none';
        break;
      }
    }

    const importance = p.mode === 'hard' ? 'Enforced' : this.weightLabel(p.weight);
    return value ? `${value} · ${importance}` : importance;
  }

  enablePref(type: PreferenceType): void {
    const defaultParams: Record<string, unknown> = {};
    if (type === 'weekend') defaultParams['mode'] = 'avoid';
    if (type === 'hours_target') defaultParams['target'] = 40;
    if (type === 'max_consecutive_days') defaultParams['max'] = 5;
    if (type === 'preferred_shift_type') defaultParams['shiftIds'] = [];
    if (type === 'preferred_days_off') defaultParams['days'] = [6, 7];

    this.preferencesService
      .create(this.memberId(), { type, params: defaultParams, weight: 3, mode: 'soft' })
      .subscribe({
        next: () => {
          this.loadPreferences();
          this.expandedType.set(type);
        },
        error: (e) => { console.error('Failed to enable preference', e); },
      });
  }

  togglePref(p: MemberPreference): void {
    this.preferencesService.remove(p.id).subscribe(() => {
      if (this.expandedType() === p.type) this.expandedType.set(null);
      this.loadPreferences();
    });
  }

  toggleEnforce(p: MemberPreference): void {
    if (p.mode === 'hard') {
      // Turn off enforce → soft
      this.preferencesService.update(p.id, { mode: 'soft' }).subscribe((updated) => {
        this.preferences.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      });
    } else {
      // Turn on enforce → hard + auto-approve if manager/owner
      this.preferencesService.update(p.id, { mode: 'hard' }).subscribe((updated) => {
        this.preferences.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        if (this.canApprove()) {
          this.preferencesService.approve(updated.id).subscribe((approved) => {
            this.preferences.update((list) => list.map((x) => (x.id === approved.id ? approved : x)));
          });
        }
      });
    }
  }

  getParam(p: MemberPreference, key: string, fallback: unknown): unknown {
    return (p.params as Record<string, unknown>)?.[key] ?? fallback;
  }

  setParam(p: MemberPreference, key: string, value: unknown): void {
    const params = { ...(p.params as Record<string, unknown>), [key]: value };
    this.preferencesService.update(p.id, { params }).subscribe((updated) => {
      this.preferences.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    });
  }

  setWeight(p: MemberPreference, weight: number): void {
    this.preferencesService.update(p.id, { weight }).subscribe((updated) => {
      this.preferences.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    });
  }

  hasDay(p: MemberPreference, day: number): boolean {
    const days = (p.params as Record<string, unknown>)?.['days'] as number[] | undefined;
    return days?.includes(day) ?? false;
  }

  toggleDay(p: MemberPreference, day: number): void {
    const days = [...(((p.params as Record<string, unknown>)?.['days'] as number[] | undefined) ?? [])];
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1);
    else days.push(day);
    days.sort((a, b) => a - b);
    this.setParam(p, 'days', days);
  }

  approvePref(p: MemberPreference): void {
    this.preferencesService.approve(p.id).subscribe((updated) => {
      this.preferences.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    });
  }

  revokePref(p: MemberPreference): void {
    this.preferencesService.revoke(p.id).subscribe((updated) => {
      this.preferences.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    });
  }

  // Delete
  deleteMember(): void {
    const m = this.member();
    if (!m) return;
    this.members.remove(m.id).subscribe(() => {
      history.back();
    });
  }

  parseInt(v: string): number {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? 0 : n;
  }
}

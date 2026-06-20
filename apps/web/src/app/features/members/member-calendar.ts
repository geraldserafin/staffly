import { Component, computed, input, signal } from '@angular/core';
import { Availability, MemberShift } from '../../core/models';
import { Icon } from '../../ui/icon';

@Component({
  selector: 'app-member-calendar',
  imports: [Icon],
  template: `
    <div class="cal-nav">
      <button class="cal-nav-btn" (click)="prev()" type="button">
        <app-icon name="chevron-right" [size]="22" />
      </button>
      <span class="cal-month-label">{{ monthLabel() }}</span>
      <button class="cal-nav-btn" (click)="next()" type="button">
        <app-icon name="chevron-right" [size]="22" />
      </button>
    </div>

    <div class="cal-weekdays">
      @for (d of weekdays; track d) {
        <span>{{ d }}</span>
      }
    </div>

    <div class="cal-grid">
      @for (cell of cells(); track cell.key) {
        <div class="cal-cell" [class.outside]="cell.outside" [class.today]="cell.isToday">
          <span class="cal-day">{{ cell.day }}</span>
          <div class="cal-events">
            @for (s of cell.shifts; track s.shiftId) {
              <div class="cal-event cal-shift" [class.locked]="s.locked" [title]="s.shiftName + ' · ' + s.teamName">
                <span class="cal-event-time">{{ timeLabel(s.startAt) }}</span>
                <span class="cal-event-name">{{ s.shiftName }}</span>
              </div>
            }
            @for (a of cell.availabilities; track a.id) {
              <div
                class="cal-event cal-avail"
                [class.avail-yes]="a.kind === 'available'"
                [class.avail-no]="a.kind === 'unavailable'"
                [title]="a.reason || a.kind"
              >
                <span class="cal-event-name">{{ a.kind === 'available' ? 'Available' : 'Unavailable' }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <div class="cal-insights">
      <div class="insight">
        <span class="insight-value">{{ monthShiftCount() }}</span>
        <span class="insight-label">shifts</span>
      </div>
      <div class="insight">
        <span class="insight-value">{{ monthHours() }}</span>
        <span class="insight-label">hours</span>
      </div>
      <div class="insight">
        <span class="insight-value">{{ monthDaysOff() }}</span>
        <span class="insight-label">days off</span>
      </div>
    </div>
  `,
  styles: [
    `
      .cal-weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
        margin-bottom: 2px;
      }
      .cal-weekdays span {
        text-align: center;
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--muted-foreground);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: 0.3rem 0;
      }
      .cal-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
      }
      .cal-cell {
        min-height: 4.5rem;
        padding: 0.25rem 0.3rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        overflow: hidden;
      }
      .cal-cell.outside {
        opacity: 0.35;
      }
      .cal-cell.today {
        border-color: var(--primary);
        background: var(--primary-faded);
      }
      .cal-day {
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--muted-foreground);
      }
      .cal-cell.today .cal-day {
        color: var(--primary);
      }
      .cal-events {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        overflow: hidden;
      }
      .cal-event {
        font-size: 0.68rem;
        padding: 0.15rem 0.3rem;
        border-radius: 0.25rem;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .cal-shift {
        background: color-mix(in oklab, var(--primary), transparent 85%);
        color: color-mix(in oklab, var(--primary), white 30%);
        border-left: 2px solid var(--primary);
      }
      .cal-shift.locked {
        background: color-mix(in oklab, hsl(40 90% 60%), transparent 85%);
        color: hsl(40 90% 75%);
        border-left-color: hsl(40 90% 60%);
      }
      .cal-event-time {
        font-weight: 600;
        flex-shrink: 0;
      }
      .cal-event-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cal-avail.avail-yes {
        background: color-mix(in oklab, hsl(142 71% 45%), transparent 88%);
        color: hsl(142 65% 65%);
      }
      .cal-avail.avail-no {
        background: color-mix(in oklab, var(--destructive), transparent 88%);
        color: hsl(0 80% 75%);
      }

      .cal-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
      }
      .cal-nav-btn {
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        border-radius: var(--radius-sm);
        background: var(--muted);
        border: 1px solid var(--border);
        color: var(--foreground);
        cursor: pointer;
        padding: 0;
      }
      .cal-nav-btn:hover {
        background: var(--accent);
      }
      .cal-nav-btn:first-child app-icon {
        transform: rotate(180deg);
        display: inline-flex;
      }
      .cal-month-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--foreground);
      }

      .cal-insights {
        display: flex;
        gap: 1.5rem;
        margin-top: 0.85rem;
        padding-top: 0.85rem;
        border-top: 1px solid var(--border);
      }
      .insight {
        display: flex;
        align-items: baseline;
        gap: 0.3rem;
      }
      .insight-value {
        font-size: 1.3rem;
        font-weight: 700;
        color: var(--foreground);
      }
      .insight-label {
        font-size: 0.78rem;
        color: var(--muted-foreground);
      }
    `,
  ],
})
export class MemberCalendar {
  // Coerce null/undefined to [] — the parent may push an undefined value
  // (e.g. an API response that didn't yield an array), and every computed here
  // calls .filter()/iterates, which would throw and abort change detection.
  readonly shifts = input<MemberShift[], MemberShift[] | null | undefined>([], {
    transform: (v) => v ?? [],
  });
  readonly availabilities = input<Availability[], Availability[] | null | undefined>([], {
    transform: (v) => v ?? [],
  });

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly cursor = signal(new Date());

  readonly cells = computed(() => {
    const cur = this.cursor();
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: {
      key: string;
      day: number;
      outside: boolean;
      isToday: boolean;
      shifts: MemberShift[];
      availabilities: Availability[];
    }[] = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push(this.makeCell(d, true, today));
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      cells.push(this.makeCell(date, false, today));
    }

    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1];
      const d = new Date(last.key);
      d.setDate(d.getDate() + 1);
      cells.push(this.makeCell(d, true, today));
      if (cells.length >= 42) break;
    }

    return cells;
  });

  readonly monthLabel = computed(() => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const cur = this.cursor();
    return `${months[cur.getMonth()]} ${cur.getFullYear()}`;
  });

  readonly monthShiftCount = computed(() => {
    const cur = this.cursor();
    const y = cur.getFullYear();
    const m = cur.getMonth();
    return this.shifts().filter((s) => {
      const d = new Date(s.startAt);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
  });

  readonly monthHours = computed(() => {
    const cur = this.cursor();
    const y = cur.getFullYear();
    const m = cur.getMonth();
    let total = 0;
    for (const s of this.shifts()) {
      const d = new Date(s.startAt);
      if (d.getFullYear() === y && d.getMonth() === m) {
        const end = new Date(s.endAt);
        total += (end.getTime() - d.getTime()) / (1000 * 60 * 60);
      }
    }
    return Math.round(total);
  });

  readonly monthDaysOff = computed(() => {
    const cur = this.cursor();
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const offDays = new Set<number>();
    for (const a of this.availabilities()) {
      if (a.kind !== 'unavailable') continue;
      if (a.recurrence === 'weekly' && a.days) {
        for (let d = 1; d <= lastDay; d++) {
          const date = new Date(y, m, d);
          const dow = date.getDay() === 0 ? 7 : date.getDay();
          if (a.days.includes(dow)) offDays.add(d);
        }
      } else if (a.startAt) {
        const start = new Date(a.startAt);
        const end = a.endAt ? new Date(a.endAt) : start;
        for (let d = 1; d <= lastDay; d++) {
          const date = new Date(y, m, d);
          if (date >= start && date <= end) offDays.add(d);
        }
      }
    }
    return offDays.size;
  });

  private makeCell(date: Date, outside: boolean, today: Date) {
    const dateStr = this.dateKey(date);
    const cellShifts = this.shifts().filter((s) => this.dateKey(new Date(s.startAt)) === dateStr);
    const cellAvails = this.availabilities().filter((a) => {
      if (a.recurrence === 'weekly' && a.days) {
        const dow = date.getDay() === 0 ? 7 : date.getDay();
        return a.days.includes(dow);
      }
      if (a.startAt) {
        return this.dateKey(new Date(a.startAt)) === dateStr;
      }
      return false;
    });
    return {
      key: date.toISOString().slice(0, 10),
      day: date.getDate(),
      outside,
      isToday: date.getTime() === today.getTime(),
      shifts: cellShifts,
      availabilities: cellAvails,
    };
  }

  private dateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  timeLabel(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  prev(): void {
    const d = new Date(this.cursor());
    d.setMonth(d.getMonth() - 1);
    this.cursor.set(d);
  }

  next(): void {
    const d = new Date(this.cursor());
    d.setMonth(d.getMonth() + 1);
    this.cursor.set(d);
  }
}

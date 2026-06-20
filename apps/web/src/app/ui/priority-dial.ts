import { Component, computed, effect, input, output, signal } from '@angular/core';

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low priority',
  2: 'Standard',
  3: 'Preferred',
  4: 'Key worker',
  5: 'Essential',
};

/**
 * Circular dial for priority (1-5). Drag around the 270° arc to change value.
 * Smooth during drag, snaps to nearest integer on release.
 *
 * Arc geometry: the arc starts at 135° (bottom-left) and sweeps clockwise
 * through top to 45° (bottom-right), leaving a 90° gap at the bottom.
 * In SVG coordinates (y-down), angle 0 = right, increasing clockwise.
 */
@Component({
  selector: 'app-priority-dial',
  template: `
    <div class="dial-wrap">
      <div
        class="dial"
        (mousedown)="onGrab($event)"
        (touchstart)="onGrab($event)"
      >
        <svg viewBox="0 0 200 200" class="dial-svg">
          <!-- Background track -->
          <path
            [attr.d]="arcPath()"
            fill="none"
            stroke="var(--muted)"
            stroke-width="10"
            stroke-linecap="round"
          />
          <!-- Active fill -->
          <path
            [attr.d]="arcPath()"
            fill="none"
            stroke="var(--primary)"
            stroke-width="10"
            stroke-linecap="round"
            [attr.stroke-dasharray]="dashArray()"
            [attr.stroke-dashoffset]="dashOffset()"
          />
          <!-- Tick marks at each integer value -->
          <line [attr.x1]="tickX1(1)" [attr.y1]="tickY1(1)" [attr.x2]="tickX2(1)" [attr.y2]="tickY2(1)" stroke="var(--border)" stroke-width="2" />
          <line [attr.x1]="tickX1(2)" [attr.y1]="tickY1(2)" [attr.x2]="tickX2(2)" [attr.y2]="tickY2(2)" stroke="var(--border)" stroke-width="2" />
          <line [attr.x1]="tickX1(3)" [attr.y1]="tickY1(3)" [attr.x2]="tickX2(3)" [attr.y2]="tickY2(3)" stroke="var(--border)" stroke-width="2" />
          <line [attr.x1]="tickX1(4)" [attr.y1]="tickY1(4)" [attr.x2]="tickX2(4)" [attr.y2]="tickY2(4)" stroke="var(--border)" stroke-width="2" />
          <line [attr.x1]="tickX1(5)" [attr.y1]="tickY1(5)" [attr.x2]="tickX2(5)" [attr.y2]="tickY2(5)" stroke="var(--border)" stroke-width="2" />
          <!-- Knob -->
          <circle
            [attr.cx]="knobX()"
            [attr.cy]="knobY()"
            r="9"
            fill="var(--primary)"
            stroke="var(--background)"
            stroke-width="3"
          />
        </svg>
        <div class="dial-center">
          <span class="dial-value">{{ Math.round(displayValue()) }}</span>
          <span class="dial-label">{{ currentLabel() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dial-wrap {
        display: flex;
        justify-content: center;
        padding: 0.5rem;
      }
      .dial {
        position: relative;
        width: 200px;
        height: 200px;
        cursor: grab;
        user-select: none;
        touch-action: none;
      }
      .dial:active {
        cursor: grabbing;
      }
      .dial-svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .dial-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.15rem;
        pointer-events: none;
      }
      .dial-value {
        font-size: 2.2rem;
        font-weight: 700;
        color: var(--foreground);
        line-height: 1;
      }
      .dial-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--muted-foreground);
        white-space: nowrap;
      }
    `,
  ],
})
export class PriorityDial {
  readonly value = input.required<number>();
  readonly valueChange = output<number>();

  readonly displayValue = signal(1);
  readonly Math = Math;

  // Arc geometry — SVG arc from 135° to 405° (i.e. 45°), clockwise, 270° sweep.
  private readonly cx = 100;
  private readonly cy = 100;
  private readonly r = 75;
  private readonly startAngleDeg = 135; // bottom-left
  private readonly sweepDeg = 270;

  // Arc path length for dash math.
  private readonly arcLength = (this.sweepDeg / 360) * 2 * Math.PI * this.r;

  readonly currentLabel = computed(() => PRIORITY_LABELS[this.value()] ?? '');

  /** SVG path for the arc (used for both background and fill). */
  readonly arcPath = computed(() => {
    return this.describeArc(this.cx, this.cy, this.r, this.startAngleDeg, this.startAngleDeg + this.sweepDeg);
  });

  readonly dashArray = computed(() => this.arcLength);

  /** Dash offset: 0 = fully filled, arcLength = empty. */
  readonly dashOffset = computed(() => {
    const ratio = (this.displayValue() - 1) / 4;
    return this.arcLength * (1 - ratio);
  });

  readonly knobX = computed(() => {
    const ratio = (this.displayValue() - 1) / 4;
    const angle = (this.startAngleDeg + ratio * this.sweepDeg) * (Math.PI / 180);
    return this.cx + this.r * Math.cos(angle);
  });

  readonly knobY = computed(() => {
    const ratio = (this.displayValue() - 1) / 4;
    const angle = (this.startAngleDeg + ratio * this.sweepDeg) * (Math.PI / 180);
    return this.cy + this.r * Math.sin(angle);
  });

  private dragging = false;

  constructor() {
    effect(() => {
      if (!this.dragging) {
        this.displayValue.set(this.value());
      }
    });
  }

  onGrab(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging = true;
    this.updateFromEvent(event);

    const onMove = (e: MouseEvent | TouchEvent) => this.updateFromEvent(e);
    const onEnd = () => {
      if (this.dragging) {
        this.dragging = false;
        const snapped = Math.round(this.displayValue());
        this.displayValue.set(snapped);
        this.valueChange.emit(snapped);
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }

  private updateFromEvent(event: MouseEvent | TouchEvent): void {
    const dial = document.querySelector('.dial') as HTMLElement | null;
    if (!dial) return;
    const rect = dial.getBoundingClientRect();
    const scale = rect.width / 200; // viewBox is 200x200
    const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
    const clientY = 'touches' in event ? event.touches[0]?.clientY ?? 0 : event.clientY;

    // Convert to SVG coordinates
    const svgX = (clientX - rect.left) / scale;
    const svgY = (clientY - rect.top) / scale;

    const dx = svgX - this.cx;
    const dy = svgY - this.cy;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    // Arc starts at 135° and sweeps 270° clockwise to 45° (405°).
    // Compute distance along the arc from the start.
    const start = this.startAngleDeg; // 135
    let along: number;
    if (angle >= start) {
      along = angle - start;
    } else {
      along = angle + 360 - start;
    }

    // Clamp to arc range.
    along = Math.max(0, Math.min(this.sweepDeg, along));

    const ratio = along / this.sweepDeg;
    const val = 1 + ratio * 4;
    this.displayValue.set(Math.max(1, Math.min(5, val)));
  }

  // --- SVG arc helpers ---

  private polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const a = angleDeg * (Math.PI / 180);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  private describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const start = this.polarToCartesian(cx, cy, r, startAngle);
    const end = this.polarToCartesian(cx, cy, r, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  // Tick marks
  tickX1(t: number): number {
    const a = (this.startAngleDeg + ((t - 1) / 4) * this.sweepDeg) * (Math.PI / 180);
    return this.cx + (this.r + 10) * Math.cos(a);
  }
  tickY1(t: number): number {
    const a = (this.startAngleDeg + ((t - 1) / 4) * this.sweepDeg) * (Math.PI / 180);
    return this.cy + (this.r + 10) * Math.sin(a);
  }
  tickX2(t: number): number {
    const a = (this.startAngleDeg + ((t - 1) / 4) * this.sweepDeg) * (Math.PI / 180);
    return this.cx + (this.r + 18) * Math.cos(a);
  }
  tickY2(t: number): number {
    const a = (this.startAngleDeg + ((t - 1) / 4) * this.sweepDeg) * (Math.PI / 180);
    return this.cy + (this.r + 18) * Math.sin(a);
  }
}

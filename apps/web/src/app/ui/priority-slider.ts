import { Component, computed, effect, input, output, signal } from '@angular/core';

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low priority',
  2: 'Standard',
  3: 'Preferred',
  4: 'Key worker',
  5: 'Essential',
};

@Component({
  selector: 'app-priority-slider',
  template: `
    <div class="slider-wrap">
      <div class="slider-header">
        <span class="slider-label">Tier {{ Math.round(displayValue()) }}</span>
        <span class="slider-value">{{ currentLabel() }}</span>
      </div>
      <div
        class="slider-track"
        (mousedown)="onGrab($event)"
        (touchstart)="onGrab($event)"
      >
        <div class="slider-rail"></div>
        <div class="slider-fill" [style.width.%]="percent()"></div>
        <div class="slider-thumb" [style.left.%]="percent()"></div>
      </div>
      <div class="slider-ticks">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>
    </div>
  `,
  styles: [
    `
      .slider-wrap {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
        max-width: 24rem;
      }
      .slider-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }
      .slider-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--foreground);
      }
      .slider-value {
        font-size: 0.82rem;
        color: var(--muted-foreground);
      }
      .slider-track {
        position: relative;
        height: 1.75rem;
        display: flex;
        align-items: center;
        cursor: pointer;
        user-select: none;
        touch-action: none;
      }
      .slider-rail {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 6px;
        border-radius: 3px;
        background: var(--muted);
      }
      .slider-fill {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 6px;
        border-radius: 3px;
        background: var(--primary);
        pointer-events: none;
      }
      .slider-thumb {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 1.1rem;
        height: 1.1rem;
        border-radius: 50%;
        background: var(--primary);
        border: 3px solid var(--background);
        box-shadow: var(--shadow-1);
        cursor: grab;
        pointer-events: none;
      }
      .slider-track:active .slider-thumb {
        cursor: grabbing;
      }
      .slider-ticks {
        display: flex;
        justify-content: space-between;
        padding: 0 0.35rem;
      }
      .slider-ticks span {
        font-size: 0.7rem;
        color: var(--muted-foreground);
        font-weight: 500;
        width: 1rem;
        text-align: center;
      }
    `,
  ],
})
export class PrioritySlider {
  readonly value = input.required<number>();
  readonly valueChange = output<number>();

  readonly displayValue = signal(1);
  readonly Math = Math;

  readonly currentLabel = computed(() => PRIORITY_LABELS[Math.round(this.displayValue())] ?? '');

  readonly percent = computed(() => {
    const v = Math.max(1, Math.min(5, this.displayValue()));
    return ((v - 1) / 4) * 100;
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
        this.valueChange.emit(Math.round(this.displayValue()));
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
    const track = document.querySelector('.slider-track') as HTMLElement | null;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    this.displayValue.set(1 + ratio * 4);
  }
}

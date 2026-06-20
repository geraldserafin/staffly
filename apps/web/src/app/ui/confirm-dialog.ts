import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Icon],
  template: `
    <div class="modal-overlay" (click)="dismiss()">
      <div class="modal confirm-modal" (click)="$event.stopPropagation()">
        <div class="confirm-icon">
          <app-icon name="shield" [size]="24" />
        </div>
        <h3>{{ title() }}</h3>
        <p class="confirm-message">{{ message() }}</p>
        @if (confirmLabel()) {
          <p class="confirm-hint">Type <strong>{{ confirmLabel() }}</strong> to confirm:</p>
          <input
            #confirmInput
            type="text"
            [value]="typed"
            (input)="typed = $any($event.target).value"
            class="confirm-input"
            autocomplete="off"
          />
        }
        <div class="modal-footer">
          <button type="button" class="ghost" (click)="dismiss()">Cancel</button>
          <button
            type="button"
            class="danger"
            (click)="confirm()"
            [disabled]="confirmLabel() && typed !== confirmLabel()"
          >
            {{ actionLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .confirm-modal {
        max-width: 26rem;
        text-align: center;
        padding: 1.75rem 1.5rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .confirm-modal h3 {
        font-size: 1.15rem;
      }
      .confirm-icon {
        display: grid;
        place-items: center;
        width: 3rem;
        height: 3rem;
        margin: 0 auto 0.25rem;
        border-radius: 50%;
        background: color-mix(in oklab, var(--destructive), transparent 88%);
        color: var(--destructive);
      }
      .confirm-message {
        color: var(--muted-foreground);
        font-size: 0.9rem;
        margin: 0;
      }
      .confirm-hint {
        font-size: 0.82rem;
        color: var(--muted-foreground);
        margin: 0.25rem 0 0;
      }
      .confirm-input {
        width: 100%;
        text-align: center;
        margin-bottom: 0.25rem;
      }
      .modal-footer {
        justify-content: center;
        border-top: 0;
        padding-top: 0.5rem;
      }
    `,
  ],
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input('Delete');
  readonly confirmLabel = input<string>('');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  typed = '';

  confirm(): void {
    this.confirmed.emit();
  }

  dismiss(): void {
    this.cancelled.emit();
  }
}

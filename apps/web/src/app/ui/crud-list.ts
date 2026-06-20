import { NgTemplateOutlet } from '@angular/common';
import { Component, ContentChild, TemplateRef, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

/**
 * Reusable create-and-list panel for the simple name-keyed CRUD resources
 * (skills, members, teams). Owns a validated reactive input; the host projects an
 * `<ng-template>` to render each row and handles load/create/remove + busy/error.
 *
 *   <app-crud-list heading="Skills" placeholder="Skill name"
 *                  [items]="skills()" [busy]="busy()" [error]="error()"
 *                  (add)="create($event)">
 *     <ng-template let-item>{{ item.name }} ...</ng-template>
 *   </app-crud-list>
 */
@Component({
  selector: 'app-crud-list',
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  template: `
    <section [attr.aria-busy]="busy()">
      <h3>{{ heading() }}</h3>

      <form (submit)="submit($event)" class="crud-form">
        <input
          class="crud-input"
          [formControl]="name"
          [placeholder]="placeholder()"
          [attr.aria-label]="placeholder()"
        />
        <button type="submit" class="primary" [disabled]="name.invalid || busy()">
          <ng-content select="[add-icon]" />{{ addLabel() }}
        </button>
      </form>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <ul>
        @for (item of items(); track item.id) {
          <li>
            <ng-container *ngTemplateOutlet="row; context: { $implicit: item }" />
          </li>
        } @empty {
          <li class="empty">{{ busy() ? 'Loading…' : emptyText() }}</li>
        }
      </ul>
    </section>
  `,
})
export class CrudList<T extends { id: string }> {
  readonly heading = input.required<string>();
  readonly placeholder = input('Name');
  readonly addLabel = input('Add');
  readonly emptyText = input('Nothing here yet.');
  readonly items = input<T[]>([]);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly add = output<string>();

  @ContentChild(TemplateRef) row!: TemplateRef<{ $implicit: T }>;

  readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  submit(event: Event): void {
    event.preventDefault();
    const value = this.name.value.trim();
    if (!value) {
      return;
    }
    this.add.emit(value);
    this.name.reset();
  }
}

import { Component, inject, input, signal } from '@angular/core';
import { errorMessage } from '../../core/errors';
import { Skill } from '../../core/models';
import { CrudList } from '../../ui/crud-list';
import { SkillsService } from './skills.service';

@Component({
  selector: 'app-skills-panel',
  imports: [CrudList],
  template: `
    <app-crud-list
      heading="Skills"
      placeholder="Skill name"
      addLabel="Add skill"
      emptyText="No skills."
      [items]="skills()"
      [busy]="busy()"
      [error]="error()"
      (add)="create($event)"
    >
      <ng-template let-s>
        {{ s.name }}
        <button (click)="remove(s)">delete</button>
      </ng-template>
    </app-crud-list>
  `,
})
export class SkillsPanel {
  private readonly service = inject(SkillsService);
  readonly orgId = input.required<string>();
  readonly skills = signal<Skill[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.busy.set(true);
    this.service.listByOrg(this.orgId()).subscribe({
      next: (s) => {
        this.skills.set(s);
        this.busy.set(false);
      },
      error: (e) => this.fail(e),
    });
  }

  create(name: string): void {
    this.busy.set(true);
    this.error.set(null);
    this.service.create(this.orgId(), { name }).subscribe({ next: () => this.load(), error: (e) => this.fail(e) });
  }

  remove(s: Skill): void {
    this.busy.set(true);
    this.service.remove(s.id).subscribe({ next: () => this.load(), error: (e) => this.fail(e) });
  }

  private fail(e: unknown): void {
    this.error.set(errorMessage(e));
    this.busy.set(false);
  }
}

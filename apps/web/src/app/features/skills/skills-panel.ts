import { Component, inject, input, signal } from '@angular/core';
import { errorMessage } from '../../core/errors';
import { Skill } from '../../core/models';
import { Icon } from '../../ui/icon';
import { CrudList } from '../../ui/crud-list';
import { SkillsService } from './skills.service';

@Component({
  selector: 'app-skills-panel',
  imports: [CrudList, Icon],
  template: `
    <header class="page-head">
      <div>
        <h2>Skills</h2>
        <p class="subtitle">Org-wide catalog of qualifications. A skill means the same across all teams.</p>
      </div>
    </header>

    <app-crud-list
      heading="All skills"
      placeholder="Skill name"
      addLabel="Add skill"
      emptyText="No skills yet."
      [items]="skills()"
      [busy]="busy()"
      [error]="error()"
      (add)="create($event)"
    >
      <ng-template let-s>
        <span class="chip">{{ s.name }}</span>
        <button class="icon-btn" style="margin-left:auto" (click)="remove(s)" title="Delete">
          <app-icon name="trash" [size]="16" />
        </button>
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

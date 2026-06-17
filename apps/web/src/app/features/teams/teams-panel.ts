import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Team } from '../../core/models';
import { CrudList } from '../../ui/crud-list';
import { TeamsService } from './teams.service';

@Component({
  selector: 'app-teams-panel',
  imports: [CrudList, RouterLink],
  template: `
    <app-crud-list
      heading="Teams"
      placeholder="Team name"
      addLabel="Add team"
      emptyText="No teams."
      [items]="teams()"
      [busy]="busy()"
      [error]="error()"
      (add)="create($event)"
    >
      <ng-template let-t>
        <a [routerLink]="['/teams', t.id]">{{ t.name }}</a>
        <button (click)="remove(t)">delete</button>
      </ng-template>
    </app-crud-list>
  `,
})
export class TeamsPanel {
  private readonly service = inject(TeamsService);
  readonly orgId = input.required<string>();
  readonly teams = signal<Team[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.busy.set(true);
    this.service.listByOrg(this.orgId()).subscribe({
      next: (t) => {
        this.teams.set(t);
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

  remove(t: Team): void {
    this.busy.set(true);
    this.service.remove(t.id).subscribe({ next: () => this.load(), error: (e) => this.fail(e) });
  }

  private fail(e: unknown): void {
    this.error.set(errorMessage(e));
    this.busy.set(false);
  }
}

import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Team } from '../../core/models';
import { Icon } from '../../ui/icon';
import { CrudList } from '../../ui/crud-list';
import { TeamsService } from './teams.service';

@Component({
  selector: 'app-teams-panel',
  imports: [CrudList, RouterLink, Icon],
  template: `
    <header class="page-head">
      <div>
        <h2>Teams</h2>
        <p class="subtitle">Locations or schedulable groups. Open a team to manage its members and schedules.</p>
      </div>
    </header>

    <app-crud-list
      heading="All teams"
      placeholder="Team name"
      addLabel="Add team"
      emptyText="No teams yet."
      [items]="teams()"
      [busy]="busy()"
      [error]="error()"
      (add)="create($event)"
    >
      <ng-template let-t>
        <a [routerLink]="[t.id, 'dashboard']" style="font-weight:600">{{ t.name }}</a>
        <span class="muted">→ dashboard</span>
        <button class="icon-btn" style="margin-left:auto" (click)="remove(t)" title="Delete">
          <app-icon name="trash" [size]="16" />
        </button>
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

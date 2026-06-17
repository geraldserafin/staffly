import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { Member } from '../../core/models';
import { CrudList } from '../../ui/crud-list';
import { MembersService } from './members.service';

@Component({
  selector: 'app-members-panel',
  imports: [CrudList, RouterLink],
  template: `
    <app-crud-list
      heading="Members"
      placeholder="Member name"
      addLabel="Add member"
      emptyText="No members."
      [items]="members()"
      [busy]="busy()"
      [error]="error()"
      (add)="create($event)"
    >
      <ng-template let-m>
        <a [routerLink]="[m.id]">{{ m.name }}</a>
        <small>priority {{ m.priority }}</small>
        <button (click)="remove(m)">delete</button>
      </ng-template>
    </app-crud-list>
  `,
})
export class MembersPanel {
  private readonly service = inject(MembersService);
  readonly orgId = input.required<string>();
  readonly members = signal<Member[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.busy.set(true);
    this.service.listByOrg(this.orgId()).subscribe({
      next: (m) => {
        this.members.set(m);
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

  remove(m: Member): void {
    this.busy.set(true);
    this.service.remove(m.id).subscribe({ next: () => this.load(), error: (e) => this.fail(e) });
  }

  private fail(e: unknown): void {
    this.error.set(errorMessage(e));
    this.busy.set(false);
  }
}

import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Member } from '../../core/models';
import { MembersService } from './members.service';

@Component({
  selector: 'app-members-panel',
  imports: [FormsModule, RouterLink],
  template: `
    <section>
      <h3>Members</h3>
      <form (submit)="create($event)">
        <input [(ngModel)]="name" name="memberName" placeholder="Member name" required />
        <button type="submit">Add member</button>
      </form>
      <ul>
        @for (m of members(); track m.id) {
          <li>
            <a [routerLink]="['/members', m.id]">{{ m.name }}</a>
            <small>priority {{ m.priority }}</small>
            <button (click)="remove(m)">delete</button>
          </li>
        } @empty {
          <li><em>No members.</em></li>
        }
      </ul>
    </section>
  `,
})
export class MembersPanel {
  private readonly service = inject(MembersService);
  readonly orgId = input.required<string>();
  readonly members = signal<Member[]>([]);
  name = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.listByOrg(this.orgId()).subscribe((m) => this.members.set(m));
  }

  create(event: Event): void {
    event.preventDefault();
    if (!this.name.trim()) return;
    this.service.create(this.orgId(), { name: this.name.trim() }).subscribe(() => {
      this.name = '';
      this.load();
    });
  }

  remove(m: Member): void {
    this.service.remove(m.id).subscribe(() => this.load());
  }
}

import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Team } from '../../core/models';
import { TeamsService } from './teams.service';

@Component({
  selector: 'app-teams-panel',
  imports: [FormsModule, RouterLink],
  template: `
    <section>
      <h3>Teams</h3>
      <form (submit)="create($event)">
        <input [(ngModel)]="name" name="teamName" placeholder="Team name" required />
        <button type="submit">Add team</button>
      </form>
      <ul>
        @for (t of teams(); track t.id) {
          <li>
            <a [routerLink]="['/teams', t.id]">{{ t.name }}</a>
            <button (click)="remove(t)">delete</button>
          </li>
        } @empty {
          <li><em>No teams.</em></li>
        }
      </ul>
    </section>
  `,
})
export class TeamsPanel {
  private readonly service = inject(TeamsService);
  readonly orgId = input.required<string>();
  readonly teams = signal<Team[]>([]);
  name = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.listByOrg(this.orgId()).subscribe((t) => this.teams.set(t));
  }

  create(event: Event): void {
    event.preventDefault();
    if (!this.name.trim()) return;
    this.service.create(this.orgId(), { name: this.name.trim() }).subscribe(() => {
      this.name = '';
      this.load();
    });
  }

  remove(t: Team): void {
    this.service.remove(t.id).subscribe(() => this.load());
  }
}

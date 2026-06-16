import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Skill } from '../../core/models';
import { SkillsService } from './skills.service';

@Component({
  selector: 'app-skills-panel',
  imports: [FormsModule],
  template: `
    <section>
      <h3>Skills</h3>
      <form (submit)="create($event)">
        <input [(ngModel)]="name" name="skillName" placeholder="Skill name" required />
        <button type="submit">Add skill</button>
      </form>
      <ul>
        @for (s of skills(); track s.id) {
          <li>{{ s.name }} <button (click)="remove(s)">delete</button></li>
        } @empty {
          <li><em>No skills.</em></li>
        }
      </ul>
    </section>
  `,
})
export class SkillsPanel {
  private readonly service = inject(SkillsService);
  readonly orgId = input.required<string>();
  readonly skills = signal<Skill[]>([]);
  name = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.listByOrg(this.orgId()).subscribe((s) => this.skills.set(s));
  }

  create(event: Event): void {
    event.preventDefault();
    if (!this.name.trim()) return;
    this.service.create(this.orgId(), { name: this.name.trim() }).subscribe(() => {
      this.name = '';
      this.load();
    });
  }

  remove(s: Skill): void {
    this.service.remove(s.id).subscribe(() => this.load());
  }
}

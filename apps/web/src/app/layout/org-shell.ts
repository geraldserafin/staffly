import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Organization } from '../core/models';
import { OrganizationsService } from '../features/organizations/organizations.service';

/**
 * Org workspace shell: an org switcher plus a persistent left sidebar of sections
 * (Members, Teams, Skills, Templates, Schedules). Section and detail pages render
 * into the content outlet, so the sidebar stays put as you drill in.
 */
@Component({
  selector: 'app-org-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <label class="org-switch">
          <span class="muted">Organization</span>
          <select [value]="orgId()" (change)="switch($event)">
            @for (o of orgs(); track o.id) {
              <option [value]="o.id">{{ o.name }}</option>
            }
          </select>
        </label>

        <nav>
          <a routerLink="members" routerLinkActive="active">Members</a>
          <a routerLink="teams" routerLinkActive="active">Teams</a>
          <a routerLink="skills" routerLinkActive="active">Skills</a>
          <a routerLink="templates" routerLinkActive="active">Shift templates</a>
          <a routerLink="schedules" routerLinkActive="active">Schedules</a>
        </nav>

        <a class="back" routerLink="/orgs">‹ All organizations</a>
      </aside>

      <div class="content">
        <router-outlet />
      </div>
    </div>
  `,
})
export class OrgShell {
  private readonly service = inject(OrganizationsService);
  private readonly router = inject(Router);

  readonly orgId = input.required<string>();
  readonly orgs = signal<Organization[]>([]);

  ngOnInit(): void {
    this.service.list().subscribe((o) => this.orgs.set(o));
  }

  switch(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id && id !== this.orgId()) {
      this.router.navigate(['/orgs', id]);
    }
  }
}

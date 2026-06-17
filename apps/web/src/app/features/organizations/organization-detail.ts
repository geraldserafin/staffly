import { Component, inject, input, signal } from '@angular/core';
import { errorMessage } from '../../core/errors';
import { Organization } from '../../core/models';
import { MembersPanel } from '../members/members-panel';
import { TeamsPanel } from '../teams/teams-panel';
import { SkillsPanel } from '../skills/skills-panel';
import { ShiftTemplatesPanel } from '../shift-templates/shift-templates-panel';
import { OrganizationsService } from './organizations.service';

@Component({
  selector: 'app-organization-detail',
  imports: [MembersPanel, TeamsPanel, SkillsPanel, ShiftTemplatesPanel],
  template: `
    @if (org(); as o) {
      <h2>{{ o.name }}</h2>
      <p class="muted">Payroll period: {{ o.payrollPeriod }}</p>
      <app-members-panel [orgId]="o.id" />
      <app-teams-panel [orgId]="o.id" />
      <app-skills-panel [orgId]="o.id" />
      <app-shift-templates-panel [orgId]="o.id" />
    } @else if (error()) {
      <p class="error">{{ error() }}</p>
    } @else {
      <p class="empty">Loading…</p>
    }
  `,
})
export class OrganizationDetail {
  private readonly service = inject(OrganizationsService);
  readonly orgId = input.required<string>(); // bound from route param
  readonly org = signal<Organization | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.service.get(this.orgId()).subscribe({
      next: (o) => this.org.set(o),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}

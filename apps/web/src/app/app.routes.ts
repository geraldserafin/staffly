import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orgs' },
  {
    path: 'orgs',
    loadComponent: () =>
      import('./features/organizations/organization-list').then((m) => m.OrganizationList),
  },
  {
    // Org workspace: persistent sidebar shell, sections + detail pages as children.
    path: 'orgs/:orgId',
    loadComponent: () => import('./layout/org-shell').then((m) => m.OrgShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'members' },
      {
        path: 'members',
        loadComponent: () => import('./features/members/members-panel').then((m) => m.MembersPanel),
      },
      {
        path: 'members/:memberId',
        loadComponent: () => import('./features/members/member-detail').then((m) => m.MemberDetail),
      },
      {
        path: 'teams',
        loadComponent: () => import('./features/teams/teams-panel').then((m) => m.TeamsPanel),
      },
      {
        path: 'teams/:teamId',
        loadComponent: () => import('./features/teams/team-detail').then((m) => m.TeamDetail),
      },
      {
        path: 'skills',
        loadComponent: () => import('./features/skills/skills-panel').then((m) => m.SkillsPanel),
      },
      {
        path: 'templates',
        loadComponent: () =>
          import('./features/shift-templates/shift-templates-panel').then((m) => m.ShiftTemplatesPanel),
      },
      {
        path: 'schedules',
        loadComponent: () =>
          import('./features/scheduling/schedules-page').then((m) => m.SchedulesPage),
      },
      {
        path: 'schedules/:scheduleId',
        loadComponent: () =>
          import('./features/scheduling/schedule-detail').then((m) => m.ScheduleDetail),
      },
    ],
  },
];

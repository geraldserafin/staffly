import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orgs' },
  {
    path: 'orgs',
    loadComponent: () =>
      import('./features/organizations/organization-list').then((m) => m.OrganizationList),
  },
  {
    path: 'orgs/:orgId',
    loadComponent: () =>
      import('./features/organizations/organization-detail').then((m) => m.OrganizationDetail),
  },
  {
    path: 'members/:memberId',
    loadComponent: () => import('./features/members/member-detail').then((m) => m.MemberDetail),
  },
  {
    path: 'teams/:teamId',
    loadComponent: () => import('./features/teams/team-detail').then((m) => m.TeamDetail),
  },
  {
    path: 'schedules/:scheduleId',
    loadComponent: () =>
      import('./features/scheduling/schedule-detail').then((m) => m.ScheduleDetail),
  },
];

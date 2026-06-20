import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register').then((m) => m.RegisterPage),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/onboarding').then((m) => m.OnboardingPage),
  },
  {
    path: 'accept-invitation/:token',
    loadComponent: () =>
      import('./features/auth/accept-invitation').then(
        (m) => m.AcceptInvitationPage,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'orgs',
      },
      {
        path: 'orgs',
        loadComponent: () =>
          import('./features/organizations/organization-list').then(
            (m) => m.OrganizationList,
          ),
      },
      {
        path: 'orgs/:orgId',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/organizations/org-dashboard').then(
                (m) => m.OrgDashboard,
              ),
          },
          {
            path: 'members',
            canActivate: [permissionGuard],
            data: { permission: 'members.view' },
            loadComponent: () =>
              import('./features/members/members-panel').then(
                (m) => m.MembersPanel,
              ),
          },
          {
            path: 'members/:memberId',
            canActivate: [permissionGuard],
            data: { permission: 'members.view' },
            loadComponent: () =>
              import('./features/members/member-detail').then(
                (m) => m.MemberDetail,
              ),
          },
          {
            path: 'teams',
            canActivate: [permissionGuard],
            data: { permission: 'teams.view' },
            loadComponent: () =>
              import('./features/teams/teams-panel').then(
                (m) => m.TeamsPanel,
              ),
          },
          {
            path: 'teams/:teamId',
            pathMatch: 'full',
            redirectTo: 'dashboard',
          },
          {
            path: 'teams/:teamId/dashboard',
            loadComponent: () =>
              import('./features/teams/team-dashboard').then(
                (m) => m.TeamDashboard,
              ),
          },
          {
            path: 'teams/:teamId/members',
            canActivate: [permissionGuard],
            data: { permission: 'teams.view' },
            loadComponent: () =>
              import('./features/teams/team-members').then(
                (m) => m.TeamMembers,
              ),
          },
          {
            path: 'teams/:teamId/schedules',
            canActivate: [permissionGuard],
            data: { permission: 'schedules.view' },
            loadComponent: () =>
              import('./features/teams/team-schedules').then(
                (m) => m.TeamSchedules,
              ),
          },
          {
            path: 'teams/:teamId/templates',
            canActivate: [permissionGuard],
            data: { permission: 'templates.view' },
            loadComponent: () =>
              import('./features/teams/team-templates').then(
                (m) => m.TeamTemplates,
              ),
          },
          {
            path: 'skills',
            canActivate: [permissionGuard],
            data: { permission: 'skills.view' },
            loadComponent: () =>
              import('./features/skills/skills-panel').then(
                (m) => m.SkillsPanel,
              ),
          },
          {
            path: 'templates',
            canActivate: [permissionGuard],
            data: { permission: 'templates.view' },
            loadComponent: () =>
              import('./features/shift-templates/shift-templates-panel').then(
                (m) => m.ShiftTemplatesPanel,
              ),
          },
          {
            path: 'schedules',
            canActivate: [permissionGuard],
            data: { permission: 'schedules.view' },
            loadComponent: () =>
              import('./features/scheduling/schedules-page').then(
                (m) => m.SchedulesPage,
              ),
          },
          {
            path: 'schedules/:scheduleId',
            canActivate: [permissionGuard],
            data: { permission: 'schedules.view' },
            loadComponent: () =>
              import('./features/scheduling/schedule-detail').then(
                (m) => m.ScheduleDetail,
              ),
          },
        ],
      },
    ],
  },
];

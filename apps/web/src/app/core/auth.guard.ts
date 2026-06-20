import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

/** Redirects to /login if the user is not authenticated. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  return router.parseUrl('/login');
};

/**
 * Checks that the current user has the permission specified in
 * `route.data['permission']` within the current org (`route.params['orgId']`).
 * Redirects to the org dashboard if denied.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const permission = route.data?.['permission'] as string | undefined;
  const orgId = route.params?.['orgId'] as string | undefined;

  if (!permission || !orgId) return true;

  if (auth.can(permission, orgId)) return true;

  return router.parseUrl(`/orgs/${orgId}/dashboard`);
};

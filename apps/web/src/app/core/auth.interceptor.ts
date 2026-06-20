import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from './auth';
import { environment } from '../../environments/environment';

const ACCESS_KEY = 'staffly_access';
const REFRESH_KEY = 'staffly_refresh';

const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/me',
  '/invitations/',
];

function isPublic(url: string): boolean {
  return PUBLIC_ENDPOINTS.some((ep) => url.includes(ep));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Read directly from localStorage to avoid circular dependency:
  // Auth injects HttpClient → interceptor injects Auth → still constructing.
  const token = localStorage.getItem(ACCESS_KEY);

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  if (!req.url.startsWith(environment.apiBase)) {
    return next(authReq);
  }

  if (isPublic(req.url)) {
    return next(authReq);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Lazy-inject Auth only when a refresh is actually needed.
      const auth = inject(Auth);

      return auth.refresh().pipe(
        switchMap(() => {
          const newToken = localStorage.getItem(ACCESS_KEY);
          return next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
            }),
          );
        }),
        catchError(() => {
          auth.clearSessionExternally();
          inject(Router).navigate(['/login']);
          return throwError(() => error);
        }),
      );
    }),
  );
};

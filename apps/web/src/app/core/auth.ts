import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, finalize, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Membership {
  organizationId: string;
  organizationName: string;
  memberId: string;
  role: string;
  permissions: string[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  memberships: Membership[];
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface MeResponse {
  user: User;
}

const ACCESS_KEY = 'staffly_access';
const REFRESH_KEY = 'staffly_refresh';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiBase;

  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);

  private refreshing: Observable<AuthResponse> | null = null;

  /**
   * Called by the app initializer before the app renders.
   *
   * 1. If there's no access token, resolve immediately (user is null).
   * 2. Try /auth/me with the current access token.
   * 3. If that fails (token expired), try to refresh.
   * 4. If refresh succeeds, user is set. If not, session is cleared.
   *
   * The interceptor skips /auth/me (it's in PUBLIC_ENDPOINTS) so there's
   * no double-handling of 401s during init.
   */
  async init(): Promise<void> {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) return;

    try {
      const res = await firstValueFrom(
        this.http.get<MeResponse>(`${this.base}/auth/me`),
      );
      this.user.set(res.user);
    } catch {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        this.clearSession();
        return;
      }

      try {
        const res = await firstValueFrom(
          this.http.post<AuthResponse>(`${this.base}/auth/refresh`, {
            refreshToken,
          }),
        );
        this.setSession(res);
      } catch {
        this.clearSession();
      }
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/auth/login`, { email, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  register(data: {
    name: string;
    email: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/auth/register`, data)
      .pipe(tap((res) => this.setSession(res)));
  }

  acceptInvitation(
    token: string,
    password: string,
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/invitations/${token}/accept`, {
        password,
        password_confirmation: password,
      })
      .pipe(tap((res) => this.setSession(res)));
  }

  getInvitation(
    token: string,
  ): Observable<{
    organizationName: string;
    memberName: string;
    email: string;
    expiresAt: string;
  }> {
    return this.http.get<{
      organizationName: string;
      memberName: string;
      email: string;
      expiresAt: string;
    }>(`${this.base}/invitations/${token}`);
  }

  logout(): void {
    this.http.post(`${this.base}/auth/logout`, {}).subscribe({
      complete: () => this.clearAndRedirect(),
      error: () => this.clearAndRedirect(),
    });
  }

  refresh(): Observable<AuthResponse> {
    if (this.refreshing) return this.refreshing;

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      this.router.navigate(['/login']);
      throw new Error('No refresh token');
    }

    this.refreshing = this.http
      .post<AuthResponse>(`${this.base}/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => this.setSession(res)),
        finalize(() => {
          this.refreshing = null;
        }),
        shareReplay(1),
      );

    return this.refreshing;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  /** Role of the current user in a given org, or null. */
  roleInOrg(orgId: string): string | null {
    return this.user()?.memberships.find((m) => m.organizationId === orgId)?.role ?? null;
  }

  /** True if the current user has the permission in the given org. */
  can(permission: string, orgId: string): boolean {
    const membership = this.user()?.memberships.find((m) => m.organizationId === orgId);
    return membership?.permissions.includes(permission) ?? false;
  }

  /** True if the user has ANY of the permissions in the org. */
  canAny(permissions: string[], orgId: string): boolean {
    return permissions.some((p) => this.can(p, orgId));
  }

  /** Membership for a given org, or null. */
  membership(orgId: string): Membership | null {
    return this.user()?.memberships.find((m) => m.organizationId === orgId) ?? null;
  }

  private setSession(res: AuthResponse): void {
    localStorage.setItem(ACCESS_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    this.user.set(res.user);
  }

  clearSessionExternally(): void {
    this.clearSession();
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.user.set(null);
  }

  private clearAndRedirect(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }
}

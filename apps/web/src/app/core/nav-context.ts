import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';

/**
 * Tracks the currently-active org and team id from the URL so components
 * outside the routed subtree (notably the global Sidebar) can react to
 * navigation. Routed pages still receive these via component input binding;
 * this service is for the persistent shell.
 */
@Injectable({ providedIn: 'root' })
export class NavContext {
  private readonly router = inject(Router);

  readonly orgId = signal<string | null>(null);
  readonly teamId = signal<string | null>(null);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        map(() => this.extract()),
      )
      .subscribe((ids) => {
        this.orgId.set(ids.orgId);
        this.teamId.set(ids.teamId);
      });
    // Seed synchronously from the current router state (e.g. on hard reload).
    const ids = this.extract();
    this.orgId.set(ids.orgId);
    this.teamId.set(ids.teamId);
  }

  private extract(): { orgId: string | null; teamId: string | null } {
    let root: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let orgId: string | null = null;
    let teamId: string | null = null;
    while (root) {
      const p = root.paramMap;
      if (p.has('orgId')) orgId = p.get('orgId');
      if (p.has('teamId')) teamId = p.get('teamId');
      root = root.firstChild;
    }
    return { orgId, teamId };
  }
}

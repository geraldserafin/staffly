import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Organization } from '../core/models';
import { NavContext } from '../core/nav-context';
import { errorMessage } from '../core/errors';
import { Auth } from '../core/auth';
import { OrganizationsService } from '../features/organizations/organizations.service';
import { Icon } from '../ui/icon';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <a class="sidebar-brand" routerLink="/orgs">
      <span class="logo-mark"><app-icon name="calendar" [size]="18" /></span>
      Staffly
    </a>

    @if (orgId()) {
      <!-- Organization switcher -->
      <div class="sidebar-org">
        <button type="button" class="org-trigger" (click)="orgMenuOpen.set(!orgMenuOpen())">
          <span class="org-current">
            <span class="label">Organization</span>
            <span class="name">{{ currentOrg()?.name ?? '—' }}</span>
          </span>
          <app-icon name="chevrons-up-down" [size]="16" />
        </button>
        @if (orgMenuOpen()) {
          <div class="backdrop" (click)="orgMenuOpen.set(false)"></div>
          <div class="org-menu">
            @for (o of orgs(); track o.id) {
              <button type="button" (click)="switchOrg(o.id)">
                <app-icon name="building" [size]="15" />
                <span>{{ o.name }}</span>
              </button>
            } @empty {
              <span class="muted" style="padding:.45rem .55rem">No organizations.</span>
            }
          </div>
        }
      </div>

      <!-- Org-level sections (permission-gated) -->
      <nav class="sidebar-nav">
        <a class="sidebar-link" [routerLink]="orgLink('dashboard')" routerLinkActive="active">
          <app-icon name="grid" [size]="18" /> Dashboard
        </a>
        @if (can('members.view')) {
          <a class="sidebar-link" [routerLink]="orgLink('members')" routerLinkActive="active">
            <app-icon name="users" [size]="18" /> Members
          </a>
        }
        @if (can('teams.view')) {
          <a class="sidebar-link" [routerLink]="orgLink('teams')" routerLinkActive="active">
            <app-icon name="building" [size]="18" /> Teams
          </a>
        }
        @if (can('skills.view')) {
          <a class="sidebar-link" [routerLink]="orgLink('skills')" routerLinkActive="active">
            <app-icon name="shield" [size]="18" /> Skills
          </a>
        }
        @if (can('templates.view')) {
          <a class="sidebar-link" [routerLink]="orgLink('templates')" routerLinkActive="active">
            <app-icon name="clock" [size]="18" /> Shift templates
          </a>
        }
        @if (can('schedules.view')) {
          <a class="sidebar-link" [routerLink]="orgLink('schedules')" routerLinkActive="active">
            <app-icon name="calendar" [size]="18" /> Schedules
          </a>
        }
      </nav>
    } @else {
      <!-- No org selected (landing / org list) -->
      <span class="sidebar-section-label">Organizations</span>
      <nav class="sidebar-nav">
        @for (o of orgs(); track o.id) {
          <a class="sidebar-link" [routerLink]="['/orgs', o.id, 'dashboard']">
            <app-icon name="building" [size]="18" /> {{ o.name }}
          </a>
        } @empty {
          <span class="muted" style="padding:.3rem .6rem;font-size:.85rem">
            {{ orgsBusy() ? 'Loading…' : 'No organizations yet.' }}
          </span>
        }
      </nav>
      @if (orgError()) {
        <p class="error" style="margin:.5rem .625rem">{{ orgError() }}</p>
      }
    }

    <!-- User footer -->
    @if (user()) {
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="avatar">{{ initials() }}</div>
          <div class="user-text">
            <span class="user-name">{{ user()!.name }}</span>
            <span class="user-email">{{ user()!.email }}</span>
          </div>
        </div>
        <button class="icon-btn logout-btn" (click)="logout()" title="Sign out">
          <app-icon name="log-out" [size]="17" />
        </button>
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: sticky;
        top: 0;
        align-self: start;
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: var(--sidebar-bg);
        border-right: 1px solid var(--sidebar-border);
        overflow-y: auto;
        scrollbar-width: thin;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        background: transparent;
      }
    `,
  ],
})
export class Sidebar {
  private readonly orgsService = inject(OrganizationsService);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  protected readonly nav = inject(NavContext);

  readonly orgs = signal<Organization[]>([]);
  readonly orgsBusy = signal(false);
  readonly orgError = signal<string | null>(null);

  readonly orgMenuOpen = signal(false);

  readonly currentOrg = computed(() => {
    const id = this.nav.orgId();
    return id ? this.orgs().find((o) => o.id === id) ?? null : null;
  });

  readonly user = this.auth.user;

  readonly initials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  protected orgId = this.nav.orgId;

  /** Absolute link to an org-level section. */
  protected orgLink(section: string): (string | null)[] {
    return ['/orgs', this.nav.orgId(), section];
  }

  /** Permission check against the current org. */
  protected can(permission: string): boolean {
    const orgId = this.nav.orgId();
    return orgId ? this.auth.can(permission, orgId) : false;
  }

  constructor() {
    this.loadOrgs();
  }

  switchOrg(id: string): void {
    this.orgMenuOpen.set(false);
    if (id !== this.nav.orgId()) {
      this.router.navigate(['/orgs', id, 'dashboard']);
    }
  }

  logout(): void {
    this.auth.logout();
  }

  private loadOrgs(): void {
    this.orgsBusy.set(true);
    this.orgError.set(null);
    this.orgsService.list().subscribe({
      next: (o) => {
        this.orgs.set(o);
        this.orgsBusy.set(false);
      },
      error: (e) => {
        this.orgError.set(errorMessage(e));
        this.orgsBusy.set(false);
      },
    });
  }
}

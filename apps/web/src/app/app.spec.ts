import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { Auth } from './core/auth';
import { OrganizationsService } from './features/organizations/organizations.service';
import { TeamsService } from './features/teams/teams.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            user: () => ({ id: 1, name: 'Test', email: 'test@test.com', emailVerifiedAt: null, memberships: [] }),
            isAuthenticated: () => true,
            can: () => false,
            roleInOrg: () => null,
            membership: () => null,
            getAccessToken: () => null,
            getRefreshToken: () => null,
            logout: () => {},
            init: () => Promise.resolve(),
          },
        },
        { provide: OrganizationsService, useValue: { list: () => of([]) } },
        { provide: TeamsService, useValue: { listByOrg: () => of([]) } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the brand in the sidebar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.sidebar-brand')?.textContent).toContain('Staffly');
  });
});

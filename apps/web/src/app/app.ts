import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Auth } from './core/auth';
import { Sidebar } from './layout/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  private readonly isAuthPage = computed(() => {
    const u = this.url();
    return (
      u.startsWith('/login') ||
      u.startsWith('/register') ||
      u.startsWith('/accept-invitation') ||
      u.startsWith('/onboarding')
    );
  });

  readonly showShell = computed(() => this.auth.isAuthenticated() && !this.isAuthPage());
}

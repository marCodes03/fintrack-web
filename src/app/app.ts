import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Creating the service applies the saved or system theme before any page renders
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  constructor() {
    // After each navigation, send focus to the page content so screen readers announce the new page
    // Query-string or fragment-only changes (filters, pagination) keep the user's focus and scroll position.
    let lastPath = this.router.url.split(/[?#]/)[0];
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe((e) => {
      const path = e.urlAfterRedirects.split(/[?#]/)[0];
      if (path === lastPath) return;
      lastPath = path;
      setTimeout(() => {
        const target = document.getElementById('main-content') ?? document.querySelector<HTMLElement>('h1');
        if (target) {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
        window.scrollTo(0, 0);
      });
    });
  }
}

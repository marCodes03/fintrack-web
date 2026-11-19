import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
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
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
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

import { Injectable, signal } from '@angular/core';

const LIGHT = '#f8fafc';
const DARK = '#020617';

/** Single source of truth for the light/dark theme: the `dark` class on <html>, the stored choice, and the browser chrome color. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(false);

  constructor() {
    let stored: string | null = null;
    try { stored = localStorage.getItem('theme'); } catch { /* storage blocked */ }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    this.apply(stored ? stored === 'dark' : media.matches);
    // Follow the OS while the user has not chosen a theme
    media.addEventListener('change', (e) => {
      let chosen: string | null = null;
      try { chosen = localStorage.getItem('theme'); } catch { /* storage blocked */ }
      if (!chosen) this.apply(e.matches);
    });
  }

  toggle(): void {
    const next = !this.isDark();
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch { /* storage blocked */ }
    this.apply(next);
  }

  private apply(dark: boolean): void {
    // Silence transitions for one frame so every themed surface flips together instead of cascading
    const root = document.documentElement;
    root.setAttribute('data-theme-switching', '');
    this.isDark.set(dark);
    document.documentElement.classList.toggle('dark', dark);
    // One meta color that follows the manual choice (replaces the media-query pair)
    document.querySelectorAll('meta[name="theme-color"]').forEach((m, i) => (i === 0 ? m.removeAttribute('media') : m.remove()));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? DARK : LIGHT);
    void root.offsetHeight;
    requestAnimationFrame(() => root.removeAttribute('data-theme-switching'));
  }
}

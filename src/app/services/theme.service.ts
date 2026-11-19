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
    // Keep a single theme-color tag that follows the chosen theme (replaces the media-query pair). Done once, not per apply().
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach((m, i) => (i === 0 ? m.removeAttribute('media') : m.remove()));

    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    this.apply(stored ? stored === 'dark' : !!media?.matches);
    // Follow the OS while the user has not chosen a theme
    media?.addEventListener('change', (e) => {
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? DARK : LIGHT);
    void root.offsetHeight;
    requestAnimationFrame(() => root.removeAttribute('data-theme-switching'));
  }
}

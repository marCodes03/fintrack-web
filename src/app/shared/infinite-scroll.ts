import { DestroyRef, NgZone, effect, inject } from '@angular/core';

/**
 * Loads more list items when the page nears its end (below 1024px the list grows with the page).
 * Call from a field initializer (injection context).
 * - Listens outside Angular's zone, so scrolling does not run change detection; only a real load re-enters it.
 * - Re-checks after every change in `deps` and on resize, so a page too short to scroll still fills up.
 */
export function infiniteWindowScroll(opts: {
  hasMore: () => boolean;
  loadMore: () => void;
  /** Read inside an effect; when it changes the page is re-checked after render. */
  deps?: () => unknown;
}): void {
  const zone = inject(NgZone);
  const destroyRef = inject(DestroyRef);
  let frame = 0;

  const check = () => {
    if (window.innerWidth >= 1024 || !opts.hasMore()) return;
    const doc = document.documentElement;
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 200) zone.run(opts.loadMore);
  };
  const scheduleCheck = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(check);
  };

  zone.runOutsideAngular(() => {
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', scheduleCheck, { passive: true });
  });
  destroyRef.onDestroy(() => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', check);
    window.removeEventListener('resize', scheduleCheck);
  });

  effect(() => {
    opts.deps?.();
    scheduleCheck();
  });
}

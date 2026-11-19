import { Component, ElementRef, viewChild, HostListener, Input, Output, EventEmitter, inject, signal } from '@angular/core';

export interface RowMenuItem {
  key: string;
  label: string;
  danger?: boolean;
}

/** Kebab button that opens a small action menu. The menu is position:fixed so table scroll containers never clip it. */
@Component({
  selector: 'app-row-menu',
  standalone: true,
  template: `
    <button type="button" data-compact #trigger
      class="inline-flex items-center justify-center h-8 w-8 rounded-lg text-text-muted hover:text-text-heading hover:bg-surface-subtle transition-[color,background-color]"
      aria-haspopup="menu" [attr.aria-expanded]="open()" [attr.aria-label]="label"
      (click)="toggle($event, trigger)" (keydown.arrowdown)="openFromKey($event, trigger)">
      <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/>
      </svg>
    </button>
    @if (open()) {
      <div #menu role="menu" animate.leave="menu-leave" [attr.aria-label]="label" [style.top.px]="top()" [style.left.px]="left()"
        [style.visibility]="positioned() ? 'visible' : 'hidden'"
        class="fixed z-40 min-w-44 bg-surface-card border border-border-subtle rounded-xl shadow-2xl p-1.5"
        (keydown)="onMenuKey($event)">
        @for (item of items; track item.key; let i = $index) {
          @if (dividerBefore(i)) { <div role="separator" aria-orientation="horizontal" class="my-1.5 border-t border-border-subtle"></div> }
          <button type="button" role="menuitem" data-compact
            class="w-full text-left px-3.5 py-3 rounded-lg text-sm font-semibold hover:bg-surface-subtle focus:bg-surface-subtle transition-colors"
            [class.text-accent-rose]="item.danger" [class.text-text-body]="!item.danger"
            (click)="choose(item.key)">{{ item.label }}</button>
        }
      </div>
    }
  `
})
export class RowMenuComponent {
  private host = inject(ElementRef<HTMLElement>);

  @Input() label = 'Row actions';
  @Input() items: RowMenuItem[] = [];
  @Output() select = new EventEmitter<string>();

  private menu = viewChild<ElementRef<HTMLElement>>("menu");
  protected open = signal(false);
  protected top = signal(0);
  protected left = signal(0);
  protected positioned = signal(false);

  /** One divider, before the first danger item that follows a non-danger item. */
  protected dividerBefore(i: number): boolean {
    const item = this.items[i];
    return !!item?.danger && i > 0 && !this.items[i - 1].danger;
  }

  protected toggle(ev: Event, trigger: HTMLElement): void {
    ev.stopPropagation();
    if (this.open()) { this.close(false); return; }
    this.show(trigger);
  }

  protected openFromKey(ev: Event, trigger: HTMLElement): void {
    ev.preventDefault();
    if (!this.open()) this.show(trigger);
  }

  private show(trigger: HTMLElement): void {
    const r = trigger.getBoundingClientRect();
    // Provisional position below the trigger; refined once the real menu size is measured.
    this.left.set(Math.max(8, r.right - 176));
    this.top.set(r.bottom + 4);
    this.positioned.set(false);
    this.open.set(true);
    // Lift the menu to <body>: animated ancestors (transform) would otherwise become the containing block of position:fixed.
    setTimeout(() => {
      const el = this.menu()?.nativeElement;
      if (!el) return;
      document.body.appendChild(el);
      // Measure the rendered menu instead of estimating, then flip above the trigger if it would overflow.
      const { width, height } = el.getBoundingClientRect();
      this.left.set(Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)));
      this.top.set(r.bottom + 4 + height > window.innerHeight ? Math.max(8, r.top - height - 4) : r.bottom + 4);
      this.positioned.set(true);
      el.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    });
  }

  protected choose(key: string): void {
    this.close(true);
    this.select.emit(key);
  }

  private close(restoreFocus: boolean): void {
    this.open.set(false);
    if (restoreFocus) this.host.nativeElement.querySelector('button')?.focus();
  }

  protected onMenuKey(ev: KeyboardEvent): void {
    const items = Array.from(this.menu()?.nativeElement.querySelectorAll('[role="menuitem"]') ?? []) as HTMLElement[];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.close(true); }
    else if (ev.key === 'Tab') { this.close(false); }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: Event): void {
    const t = ev.target as Node;
    if (this.open() && !this.host.nativeElement.contains(t) && !this.menu()?.nativeElement.contains(t)) this.close(false);
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.open()) this.close(false);
  }
}

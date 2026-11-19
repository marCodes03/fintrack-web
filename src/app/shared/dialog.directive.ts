import { Directive, ElementRef, HostListener, OnDestroy, OnInit, inject, output } from '@angular/core';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, topmost last: only the topmost one reacts to Escape. */
const openDialogs: object[] = [];

/**
 * Makes a panel a modal dialog: role and aria-modal, focus moves in on open and
 * returns on close, Tab stays inside, Escape closes the topmost dialog.
 */
@Directive({
  selector: '[appDialog]',
  standalone: true,
  host: { role: 'dialog', 'aria-modal': 'true', tabindex: '-1' }
})
export class DialogDirective implements OnInit, OnDestroy {
  readonly dialogClose = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private previouslyFocused: HTMLElement | null = null;

  ngOnInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    openDialogs.push(this);
    setTimeout(() => {
      const el = this.host.nativeElement;
      (el.querySelector<HTMLElement>('input, select, textarea') ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus();
    });
  }

  ngOnDestroy(): void {
    const i = openDialogs.indexOf(this);
    if (i >= 0) openDialogs.splice(i, 1);
    this.previouslyFocused?.focus?.();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (openDialogs[openDialogs.length - 1] === this) this.dialogClose.emit();
  }

  @HostListener('keydown', ['$event'])
  trapTab(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      e => e.offsetParent !== null
    );
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === this.host.nativeElement)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

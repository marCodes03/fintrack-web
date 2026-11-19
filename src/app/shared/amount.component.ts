import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * Money value that honors the header "hide amounts" toggle.
 * When hidden it shows a mask for sighted users and "Amount hidden" for screen readers.
 * The sign is part of the component so it is hidden too (it would reveal income vs expense).
 */
@Component({
  selector: 'app-amount',
  standalone: true,
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (hidden()) {<span aria-hidden="true">•••••</span><span class="sr-only">Amount hidden</span>} @else {{{ sign() }}{{ display() | currency:currency():'symbol-narrow' }}}`,
})
export class AmountComponent {
  protected readonly hidden = inject(AuthService).hideAmounts;
  readonly value = input.required<number | null | undefined>();
  readonly currency = input<string>('PHP');
  readonly sign = input<string>('');
  /** Count between the old and new value (250ms) when the value changes; for totals the user is driving. */
  readonly tween = input<boolean>(false);

  private readonly shown = signal<number | null | undefined>(undefined);
  private raf = 0;
  protected readonly display = computed(() => (this.tween() ? (this.shown() ?? this.value()) : this.value()));

  constructor() {
    effect((onCleanup) => {
      const target = this.value();
      const from = untracked(() => this.shown());
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!this.tween() || from == null || target == null || from === target || reduced) {
        this.shown.set(target);
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / 250);
        this.shown.set(from + (target - from) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
      onCleanup(() => cancelAnimationFrame(this.raf));
    });
  }
}

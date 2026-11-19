import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
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
  template: `@if (hidden()) {<span aria-hidden="true">•••••</span><span class="sr-only">Amount hidden</span>} @else {{{ sign() }}{{ value() | currency:currency():'symbol-narrow' }}}`,
})
export class AmountComponent {
  protected readonly hidden = inject(AuthService).hideAmounts;
  readonly value = input.required<number | null | undefined>();
  readonly currency = input<string>('PHP');
  readonly sign = input<string>('');
}

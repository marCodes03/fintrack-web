import { Pipe, PipeTransform, inject } from '@angular/core';
import { formatNumber } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * Plain-text money for places a component can't render (e.g. <option> labels).
 * Honors the header "hide amounts" toggle. Impure so it re-evaluates when the toggle changes.
 */
@Pipe({ name: 'maskedAmount', standalone: true, pure: false })
export class MaskedAmountPipe implements PipeTransform {
  private readonly hidden = inject(AuthService).hideAmounts;

  transform(value: number | null | undefined, symbol = '₱'): string {
    if (this.hidden()) return '•••••';
    return `${symbol}${formatNumber(Number(value ?? 0), 'en-US', '1.2-2')}`;
  }
}

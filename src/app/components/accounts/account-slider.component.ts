import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { DialogDirective } from '../../shared/dialog.directive';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiService, RefAccountType } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-account-slider',
  standalone: true,
  imports: [DialogDirective, FormsModule],
  templateUrl: './account-slider.component.html'
})
export class AccountSliderComponent implements OnChanges {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  @Input() isOpen = false;
  @Input() isEditMode = false;
  @Input() editingId: string | null = null;
  @Input() accountTypes: RefAccountType[] = [];

  @Input() name = '';
  @Input() type = 'CASH';
  @Input() balance: number | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  protected localName = '';
  protected localType = 'CASH';
  protected localBalance: number | null = null;

  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly fieldErrors = signal<Record<string, string>>({});

  private showFieldErrors(errors: Record<string, string>): void {
    this.fieldErrors.set(errors);
    this.errorMessage.set('Fix the highlighted fields to continue.');
    const first = Object.keys(errors).sort()[0];
    setTimeout(() => document.getElementById('account-slider-' + first)?.focus());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isOpen) {
      this.localName = this.name;
      this.localType = this.type;
      this.localBalance = this.balance;
      this.errorMessage.set(null);
      this.fieldErrors.set({});
    }
  }

  onSubmit(): void {
    const errors: Record<string, string> = {};
    if (!this.localName.trim()) errors['f1'] = 'Enter an account name.';
    if (Object.keys(errors).length) {
      this.showFieldErrors(errors);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
      this.fieldErrors.set({});

    const payload = {
      name: this.localName.trim(),
      type: this.localType,
      balance: this.localBalance || 0,
      currency: 'PHP'
    };

    if (this.isEditMode && this.editingId) {
      this.http.put(`${this.apiService.apiUrl}/accounts/${this.editingId}`, payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || "Failed to save account details. Let's try that again.");
        }
      });
    } else {
      this.http.post(`${this.apiService.apiUrl}/accounts`, payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || "Failed to create account. Let's try that again.");
        }
      });
    }
  }

  onClose(): void {
    this.close.emit();
  }

  clearForm(): void {
    this.localName = '';
    this.localType = 'CASH';
    this.localBalance = null;
    this.errorMessage.set(null);
      this.fieldErrors.set({});
  }
}

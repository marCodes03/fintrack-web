import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Account, RefIncomeCategory } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-income-slider',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './income-slider.component.html'
})
export class IncomeSliderComponent {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private _isOpen = false;
  @Input()
  set isOpen(value: boolean) {
    this._isOpen = value;
    if (value) {
      this.localDescription = this.description;
      this.localAmount = this.amount;
      this.localCategory = this.category || (this.categories.length > 0 ? this.categories[0].name : '');
      this.localAccountId = this.accountId || (this.accounts.length > 0 ? this.accounts[0].id : '');
      this.errorMessage.set(null);
    }
  }
  get isOpen(): boolean {
    return this._isOpen;
  }

  @Input() accounts: Account[] = [];
  @Input() categories: RefIncomeCategory[] = [];
  @Input() isEditMode = false;
  @Input() editingId: string | null = null;

  @Input() description = '';
  @Input() amount: number | null = null;
  @Input() category = '';
  @Input() accountId = '';

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  protected localDescription = '';
  protected localAmount: number | null = null;
  protected localCategory = '';
  protected localAccountId = '';

  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.localDescription || !this.localAmount || !this.localAccountId || !this.localCategory) {
      this.errorMessage.set('Please fill out all required fields to record your income.');
      return;
    }

    const userId = this.authService.currentUser()?.id || 'user-default-1';
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      description: this.localDescription,
      amount: Math.abs(this.localAmount),
      type: 'INCOME',
      category: this.localCategory,
      accountId: this.localAccountId,
      userId
    };

    if (this.isEditMode && this.editingId) {
      this.http.put(`${this.apiService.apiUrl}/transactions/${this.editingId}`, payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
          this.close.emit();
          this.clearForm();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || "Failed to update the income transaction. Let's try that again.");
        }
      });
    } else {
      this.http.post(`${this.apiService.apiUrl}/transactions`, payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
          this.close.emit();
          this.clearForm();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || "Failed to record the income. Let's try that again.");
        }
      });
    }
  }

  clearForm(): void {
    this.localDescription = '';
    this.localAmount = null;
    if (this.categories.length > 0) {
      this.localCategory = this.categories[0].name;
    }
    if (this.accounts.length > 0) {
      this.localAccountId = this.accounts[0].id;
    }
  }

  onClose(): void {
    this.close.emit();
  }
}

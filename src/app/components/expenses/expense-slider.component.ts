import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Account, RefExpenseCategory, BudgetPlan } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-expense-slider',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './expense-slider.component.html'
})
export class ExpenseSliderComponent {
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
      this.localExpenseType = this.expenseType;
      this.localExpenseDate = this.expenseDate || new Date().toISOString().split('T')[0];
      this.errorMessage.set(null);
    }
  }
  get isOpen(): boolean {
    return this._isOpen;
  }

  @Input() accounts: Account[] = [];
  @Input() categories: RefExpenseCategory[] = [];
  @Input() isEditMode = false;
  @Input() editingId: string | null = null;

  @Input() description = '';
  @Input() amount: number | null = null;
  @Input() category = '';
  @Input() accountId = '';
  @Input() expenseType: 'FIXED' | 'VARIABLE' = 'VARIABLE';
  @Input() expenseDate: string = new Date().toISOString().split('T')[0];

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  protected localDescription = '';
  protected localAmount: number | null = null;
  protected localCategory = '';
  protected localAccountId = '';
  protected localExpenseType: 'FIXED' | 'VARIABLE' = 'VARIABLE';
  protected localExpenseDate = '';

  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.localDescription || !this.localAmount || !this.localAccountId || !this.localCategory) {
      this.errorMessage.set('Please fill out all required fields to record your expense.');
      return;
    }

    const userId = this.authService.currentUser()?.id || 'user-default-1';
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      description: this.localDescription,
      amount: Math.abs(this.localAmount),
      type: 'EXPENSE',
      expenseType: this.localExpenseType,
      category: this.localCategory,
      accountId: this.localAccountId,
      expenseDate: this.localExpenseDate,
      userId
    };

    if (this.isEditMode && this.editingId) {
      this.http.put(`http://localhost:3000/api/transactions/${this.editingId}`, payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
          this.close.emit();
          this.clearForm();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || "Failed to update the expense transaction. Let's try that again.");
        }
      });
    } else {
      this.http.post('http://localhost:3000/api/transactions', payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
          this.close.emit();
          this.clearForm();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || "Failed to record the expense. Let's try that again.");
        }
      });
    }
  }

  clearForm(): void {
    this.localDescription = '';
    this.localAmount = null;
    this.localExpenseType = 'VARIABLE';
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

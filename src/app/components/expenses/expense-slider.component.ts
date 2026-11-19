import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { DialogDirective } from '../../shared/dialog.directive';
import { HttpClient } from '@angular/common/http';
import { MaskedAmountPipe } from '../../shared/masked-amount.pipe';
import { FormsModule } from '@angular/forms';
import { ApiService, Account, RefExpenseCategory, BudgetPlan } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-expense-slider',
  standalone: true,
  imports: [DialogDirective, FormsModule, MaskedAmountPipe],
  templateUrl: './expense-slider.component.html'
})
export class ExpenseSliderComponent implements OnChanges {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  @Input() isOpen = false;
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

  protected readonly fieldErrors = signal<Record<string, string>>({});

  private showFieldErrors(errors: Record<string, string>): void {
    this.fieldErrors.set(errors);
    this.errorMessage.set('Fix the highlighted fields to continue.');
    const first = Object.keys(errors).sort()[0];
    setTimeout(() => document.getElementById('expense-slider-' + first)?.focus());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isOpen) {
      this.localDescription = this.description;
      this.localAmount = this.amount;
      this.localCategory = this.category || (this.categories.length > 0 ? this.categories[0].name : '');
      this.localAccountId = this.accountId || (this.accounts.length > 0 ? this.accounts[0].id : '');
      this.localExpenseType = this.expenseType;
      this.localExpenseDate = this.expenseDate || new Date().toISOString().split('T')[0];
      this.errorMessage.set(null);
      this.fieldErrors.set({});
    }
  }

  onSubmit(): void {
    const errors: Record<string, string> = {};
    if (!this.localDescription) errors['f1'] = 'Enter a title.';
    if (!this.localAmount) errors['f2'] = 'Enter an amount above 0.';
    if (!this.localCategory) errors['f3'] = 'Choose a category.';
    if (!this.localAccountId) errors['f4'] = 'Choose the account you paid from.';
    if (Object.keys(errors).length) {
      this.showFieldErrors(errors);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
      this.fieldErrors.set({});

    const payload = {
      description: this.localDescription,
      amount: Math.abs(this.localAmount ?? 0),
      type: 'EXPENSE',
      expenseType: this.localExpenseType,
      category: this.localCategory,
      accountId: this.localAccountId,
      expenseDate: this.localExpenseDate
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
          this.errorMessage.set(err.error?.message || "Failed to update the expense transaction. Let's try that again.");
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

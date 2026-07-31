import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService, Account } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-transaction-slider',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './transaction-slider.component.html'
})
export class TransactionSliderComponent {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private _isOpen = false;
  @Input()
  set isOpen(value: boolean) {
    this._isOpen = value;
    if (value) {
      this.localType = this.type;
      this.localExpenseType = this.expenseType;
      this.localDescription = this.description;
      this.localAmount = this.amount;
      this.localCategory = this.category;
      this.localAccountId = this.accountId || (this.accounts.length > 0 ? this.accounts[0].id : '');
      this.localToAccountId = this.toAccountId || (this.accounts.length > 1 ? this.accounts[1].id : (this.accounts.length > 0 ? this.accounts[0].id : ''));
      this.localTransferFee = this.transferFee;
      this.localExpenseDate = this.expenseDate || new Date().toISOString().split('T')[0];
      this.updateDefaultCategory();
      this.errorMessage.set(null);
    }
  }
  get isOpen(): boolean {
    return this._isOpen;
  }

  @Input() accounts: Account[] = [];

  private _isEditMode = false;
  @Input()
  set isEditMode(value: boolean) {
    this._isEditMode = value;
  }
  get isEditMode(): boolean {
    return this._isEditMode;
  }

  private _editingId: string | null = null;
  @Input()
  set editingId(value: string | null) {
    this._editingId = value;
  }
  get editingId(): string | null {
    return this._editingId;
  }

  @Input() type: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE';
  @Input() expenseType: 'FIXED' | 'VARIABLE' = 'VARIABLE';
  @Input() description = '';
  @Input() amount: number | null = null;
  @Input() category = '';
  @Input() accountId = '';
  @Input() toAccountId = '';
  @Input() transferFee: number = 0;
  @Input() expenseDate = new Date().toISOString().split('T')[0];

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  protected incomeCategories = signal<any[]>([]);
  protected expenseCategories = signal<any[]>([]);

  protected localType: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE';
  protected localExpenseType: 'FIXED' | 'VARIABLE' = 'VARIABLE';
  protected localDescription = '';
  protected localAmount: number | null = null;
  protected localCategory = '';
  protected localAccountId = '';
  protected localToAccountId = '';
  protected localTransferFee = 0;
  protected localExpenseDate = '';

  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadCategories();
  }

  loadCategories(): void {
    this.apiService.getIncomeCategories().subscribe({
      next: (res) => {
        if (res.success) {
          const active = res.data.filter(c => c.isActive);
          this.incomeCategories.set(active);
          this.updateDefaultCategory();
        }
      }
    });

    this.apiService.getExpenseCategories().subscribe({
      next: (res) => {
        if (res.success) {
          const active = res.data.filter(c => c.isActive);
          this.expenseCategories.set(active);
          this.updateDefaultCategory();
        }
      }
    });
  }

  updateDefaultCategory(): void {
    if (this.localCategory) return;
    if (this.localType === 'INCOME' && this.incomeCategories().length > 0) {
      this.localCategory = this.incomeCategories()[0].name;
    } else if (this.localType === 'EXPENSE' && this.expenseCategories().length > 0) {
      this.localCategory = this.expenseCategories()[0].name;
    } else if (this.localType === 'TRANSFER') {
      this.localCategory = 'Transfer';
    }
  }

  onTypeChange(): void {
    this.localCategory = '';
    this.updateDefaultCategory();
  }

  onSubmit(): void {
    if (!this.localDescription || !this.localAmount || !this.localAccountId) {
      this.errorMessage.set('Please fill out all required fields to record the transaction.');
      return;
    }

    if (this.localType === 'TRANSFER' && (!this.localToAccountId || this.localAccountId === this.localToAccountId)) {
      this.errorMessage.set('Please select a different destination account for your transfer.');
      return;
    }

    const userId = this.authService.currentUser()?.id || 'user-default-1';
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      description: this.localDescription,
      amount: Math.abs(this.localAmount),
      type: this.localType,
      expenseType: this.localType === 'EXPENSE' ? this.localExpenseType : null,
      category: this.localType === 'TRANSFER' ? 'Transfer' : this.localCategory,
      accountId: this.localAccountId,
      toAccountId: this.localType === 'TRANSFER' ? this.localToAccountId : null,
      transferFee: this.localType === 'TRANSFER' ? (this.localTransferFee || 0) : 0,
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
          this.errorMessage.set(err.error?.message || "Failed to update the transaction. Let's try that again.");
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
          this.errorMessage.set(err.error?.message || "Failed to record the transaction. Let's try that again.");
        }
      });
    }
  }

  clearForm(): void {
    this.localDescription = '';
    this.localAmount = null;
    this.localTransferFee = 0;
    this.localExpenseType = 'VARIABLE';
    this.updateDefaultCategory();
  }

  onClose(): void {
    this.close.emit();
  }
}

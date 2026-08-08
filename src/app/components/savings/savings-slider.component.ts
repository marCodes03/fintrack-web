import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService, RefSavingCategory, Account, BudgetPlan } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-savings-slider',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './savings-slider.component.html'
})
export class SavingsSliderComponent implements OnChanges {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  @Input() isOpen = false;
  @Input() isEditMode = false;
  @Input() editingId: string | null = null;
  @Input() accounts: Account[] = [];

  @Input() description = '';
  @Input() amount: number | null = null;
  @Input() category = '';
  @Input() accountId = '';
  @Input() toAccountId = '';

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  protected savingsCategories = signal<RefSavingCategory[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected localDescription = '';
  protected localAmount: number | null = null;
  protected localCategory = '';
  protected localAccountId = '';
  protected localToAccountId = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isOpen) {
      this.localDescription = this.description;
      this.localAmount = this.amount;
      this.localCategory = this.category || (this.savingsCategories().length > 0 ? this.savingsCategories()[0].name : '');
      this.localAccountId = this.accountId || (this.accounts.length > 0 ? this.accounts[0].id : '');
      this.localToAccountId = this.toAccountId || (this.accounts.length > 1 ? this.accounts[1].id : (this.accounts.length > 0 ? this.accounts[0].id : ''));
      this.errorMessage.set(null);
    }
  }

  constructor() {
    this.loadCategories();
  }

  loadCategories(): void {
    this.apiService.getSavingCategories().subscribe({
      next: (res) => {
        if (res.success) {
          const active = res.data.filter(c => c.isActive);
          this.savingsCategories.set(active);
          if (!this.localCategory && active.length > 0) {
            this.localCategory = active[0].name;
          }
        }
      }
    });
  }

  onSubmit(): void {
    if (!this.localDescription || !this.localAmount || !this.localAccountId || !this.localToAccountId || !this.localCategory) {
      this.errorMessage.set('Please fill out all required fields to log your savings.');
      return;
    }

    if (this.localAccountId === this.localToAccountId) {
      this.errorMessage.set('The source and destination accounts must be different.');
      return;
    }

    const sourceAcc = this.accounts.find(a => a.id === this.localAccountId);
    const availableBalance = sourceAcc ? sourceAcc.balance : 0;

    if (Math.abs(this.localAmount) > availableBalance) {
      const accName = sourceAcc ? sourceAcc.name : 'Selected Source Account';
      const formattedBal = availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      this.errorMessage.set(`Oops, there aren't enough funds in ${accName}. You currently have ₱${formattedBal} available.`);
      return;
    }

    const userId = this.authService.currentUser()?.id || 'user-default-1';
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      description: this.localDescription,
      amount: Math.abs(this.localAmount),
      type: 'SAVINGS',
      category: this.localCategory,
      accountId: this.localAccountId,
      toAccountId: this.localToAccountId,
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
          this.errorMessage.set(err.error?.message || "Failed to update the savings transaction. Let's try that again.");
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
          this.errorMessage.set(err.error?.message || "Failed to record the savings transaction. Let's try that again.");
        }
      });
    }
  }

  clearForm(): void {
    this.localDescription = '';
    this.localAmount = null;
    if (this.savingsCategories().length > 0) {
      this.localCategory = this.savingsCategories()[0].name;
    }
    if (this.accounts.length > 0) {
      this.localAccountId = this.accounts[0].id;
      this.localToAccountId = this.accounts.length > 1 ? this.accounts[1].id : this.accounts[0].id;
    }
  }

  onClose(): void {
    this.close.emit();
  }
}

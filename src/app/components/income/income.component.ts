import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiService, Transaction, Account, RefIncomeCategory } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { ResetPasswordComponent } from '../auth/reset-password/reset-password.component';
import { ConfirmDeleteModalComponent } from '../confirm-delete-modal/confirm-delete-modal.component';
import { IncomeSliderComponent } from './income-slider.component';
import { DatePipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [HeaderComponent, ResetPasswordComponent, ConfirmDeleteModalComponent, IncomeSliderComponent, DatePipe, CurrencyPipe, FormsModule],
  templateUrl: './income.component.html'
})
export class IncomeComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  protected readonly transactions = signal<Transaction[]>([]);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly incomeCategories = signal<RefIncomeCategory[]>([]);
  protected readonly isResetModalOpen = signal<boolean>(false);
  protected readonly isLoading = signal<boolean>(false);

  // Filter & Sort State
  protected readonly timeframeFilter = signal<string>('ALL');
  protected readonly customStartDate = signal<string>('');
  protected readonly customEndDate = signal<string>('');
  protected readonly categoryFilter = signal<string>('ALL');
  protected readonly sortOrder = signal<string>('DATE_DESC');

  // Slider State
  protected readonly isSliderOpen = signal<boolean>(false);
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly editingTransactionId = signal<string | null>(null);

  // Form Fields for Slider
  protected description = '';
  protected amount: number | null = null;
  protected category = '';
  protected accountId = '';

  // Confirm Delete Modal state
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly txToDelete = signal<Transaction | null>(null);
  protected readonly isBulkDeleteModalOpen = signal<boolean>(false);
  protected readonly selectedIds = signal<Set<string>>(new Set());

  protected successMessage = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);

  protected readonly isAllSelected = computed(() => {
    const current = this.filteredTransactions();
    if (current.length === 0) return false;
    return current.every(t => this.selectedIds().has(t.id));
  });

  protected readonly totalIncome = computed(() => {
    return this.filteredTransactions().reduce((sum, tx) => sum + tx.amount, 0);
  });

  protected readonly filteredTransactions = computed(() => {
    let items = this.transactions().filter(tx => {
      if (this.categoryFilter() !== 'ALL' && tx.category !== this.categoryFilter()) {
        return false;
      }
      return this.matchesTimeframe(tx);
    });
    return this.sortTransactions(items);
  });

  private matchesTimeframe(tx: Transaction): boolean {
    const tf = this.timeframeFilter();
    if (tf === 'ALL') return true;

    const dateStr = tx.expenseDate || tx.date;
    if (!dateStr) return true;
    const d = new Date(dateStr);
    const now = new Date();

    if (tf === 'TODAY') {
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth() &&
             d.getDate() === now.getDate();
    }

    if (tf === 'THIS_WEEK') {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return d >= startOfWeek && d <= endOfWeek;
    }

    if (tf === 'THIS_MONTH') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }

    if (tf === 'CUSTOM') {
      if (this.customStartDate()) {
        const start = new Date(this.customStartDate());
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (this.customEndDate()) {
        const end = new Date(this.customEndDate());
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    }

    return true;
  }

  private sortTransactions(items: Transaction[]): Transaction[] {
    const sort = this.sortOrder();
    return [...items].sort((a, b) => {
      const dateA = new Date(a.expenseDate || a.date).getTime();
      const dateB = new Date(b.expenseDate || b.date).getTime();
      const amtA = Math.abs(a.amount);
      const amtB = Math.abs(b.amount);

      if (sort === 'DATE_DESC') return dateB - dateA;
      if (sort === 'DATE_ASC') return dateA - dateB;
      if (sort === 'AMOUNT_DESC') return amtB - amtA;
      if (sort === 'AMOUNT_ASC') return amtA - amtB;
      return 0;
    });
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadData();
  }

  loadData(): void {
    const userId = this.authService.currentUser()?.id;
    this.apiService.getTransactions(userId).subscribe({
      next: (res) => {
        if (res.success) {
          const incomeTxs = res.data.filter(t => t.type === 'INCOME');
          this.transactions.set(incomeTxs);
        }
      },
      error: (err) => console.warn('Failed to load income transactions:', err)
    });

    this.apiService.getAccounts(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.accounts.set(res.data);
          if (res.data.length > 0 && !this.accountId) {
            this.accountId = res.data[0].id;
          }
        }
      },
      error: (err) => console.warn('Failed to load accounts:', err)
    });

    this.apiService.getIncomeCategories().subscribe({
      next: (res) => {
        if (res.success) {
          this.incomeCategories.set(res.data.filter(c => c.isActive));
          if (!this.category && res.data.length > 0) {
            this.category = res.data[0].name;
          }
        }
      },
      error: () => {}
    });
  }

  getAccountName(accountId: string | undefined): string {
    if (!accountId) return 'N/A';
    const acc = this.accounts().find(a => a.id === accountId);
    return acc ? acc.name : 'Unknown Account';
  }

  openCreateSlider(): void {
    this.resetForm();
    this.isEditMode.set(false);
    this.editingTransactionId.set(null);
    this.isSliderOpen.set(true);
  }

  startEdit(tx: Transaction): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isEditMode.set(true);
    this.editingTransactionId.set(tx.id);
    this.description = tx.description;
    this.amount = tx.amount;
    this.category = tx.category;
    this.accountId = tx.accountId ?? '';
    this.isSliderOpen.set(true);
  }

  closeSlider(): void {
    this.isSliderOpen.set(false);
    this.resetForm();
  }

  onSaved(): void {
    this.successMessage.set(this.isEditMode() ? 'Your income details have been updated!' : 'Got it! Your income has been recorded.');
    this.loadData();
  }

  handleDeleteIncome(tx: Transaction): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.txToDelete.set(tx);
    this.isDeleteModalOpen.set(true);
  }

  executeDelete(): void {
    const tx = this.txToDelete();
    if (!tx) return;

    this.isLoading.set(true);
    this.http.delete(`http://localhost:3000/api/transactions/${tx.id}`).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Income transaction deleted successfully.');
        this.closeDeleteModal();
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || "Failed to delete the income. Let's try that again.");
        this.closeDeleteModal();
      }
    });
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.txToDelete.set(null);
  }

  toggleSelect(id: string): void {
    this.selectedIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  toggleSelectAll(): void {
    const currentIds = this.filteredTransactions().map(t => t.id);
    const allSelected = this.isAllSelected();
    this.selectedIds.update(set => {
      const newSet = new Set(set);
      if (allSelected) {
        currentIds.forEach(id => newSet.delete(id));
      } else {
        currentIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  }

  handleBulkDelete(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isBulkDeleteModalOpen.set(true);
  }

  executeBulkDelete(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.isLoading.set(true);
    this.http.post('http://localhost:3000/api/transactions/bulk-delete', { ids }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('All selected income transactions have been deleted.');
        this.closeBulkDeleteModal();
        this.selectedIds.set(new Set());
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || "Failed to delete the selected income transactions. Let's try that again.");
        this.closeBulkDeleteModal();
      }
    });
  }

  closeBulkDeleteModal(): void {
    this.isBulkDeleteModalOpen.set(false);
  }

  resetForm(): void {
    this.description = '';
    this.amount = null;
    this.category = this.incomeCategories().length > 0 ? this.incomeCategories()[0].name : '';
  }

  openResetModal(): void {
    this.isResetModalOpen.set(true);
  }

  closeResetModal(): void {
    this.isResetModalOpen.set(false);
  }
}

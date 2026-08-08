import { Component, signal, inject, OnInit, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiService, Transaction, Account } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { ResetPasswordComponent } from '../auth/reset-password/reset-password.component';
import { ConfirmDeleteModalComponent } from '../confirm-delete-modal/confirm-delete-modal.component';
import { TransactionSliderComponent } from './transaction-slider.component';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [HeaderComponent, ResetPasswordComponent, ConfirmDeleteModalComponent, TransactionSliderComponent, CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './transactions.component.html'
})
export class TransactionsComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  protected readonly transactions = signal<Transaction[]>([]);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly isResetModalOpen = signal<boolean>(false);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly Math = Math;

  // Filter & Sort State
  protected readonly timeframeFilter = signal<string>('ALL');
  protected readonly customStartDate = signal<string>('');
  protected readonly customEndDate = signal<string>('');
  protected readonly typeFilter = signal<string>('ALL'); // ALL, INCOME, EXPENSE, TRANSFER, SAVINGS
  protected readonly categoryFilter = signal<string>('ALL');
  protected readonly sortOrder = signal<string>('DATE_DESC');

  // Slider State
  protected readonly isSliderOpen = signal<boolean>(false);
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly editingTransactionId = signal<string | null>(null);

  // Form Fields (passed as initial state to slider)
  protected description = '';
  protected amount: number | null = null;
  protected type = 'EXPENSE';
  protected category = '';
  protected accountId = '';
  protected toAccountId = '';
  protected transferFee = 0;
  protected expenseDate = '';

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
    return this.filteredTransactions()
      .filter(t => t.type === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);
  });

  protected readonly totalExpenses = computed(() => {
    return this.filteredTransactions()
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, tx) => sum + tx.amount, 0);
  });

  // Extracted unique categories for filter dropdown
  protected readonly availableCategories = computed(() => {
    const set = new Set<string>();
    this.transactions().forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  });

  protected readonly filteredTransactions = computed(() => {
    let items = this.transactions().filter(tx => {
      // Type Filter
      if (this.typeFilter() !== 'ALL' && tx.type !== this.typeFilter()) {
        return false;
      }
      // Category Filter
      if (this.categoryFilter() !== 'ALL' && tx.category !== this.categoryFilter()) {
        return false;
      }
      return this.matchesTimeframe(tx);
    });
    return this.sortTransactions(items);
  });

  protected readonly itemsToShow = signal<number>(10);

  protected readonly paginatedTransactions = computed(() => {
    return this.filteredTransactions().slice(0, this.itemsToShow());
  });

  protected loadMore(): void {
    if (this.itemsToShow() < this.filteredTransactions().length) {
      this.itemsToShow.update(val => val + 10);
    }
  }

  onContainerScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const pos = target.scrollTop + target.clientHeight;
    const max = target.scrollHeight;
    if (pos >= max - 50) {
      this.loadMore();
    }
  }

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
          this.transactions.set(res.data);
        }
      }
    });

    this.apiService.getAccounts(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.accounts.set(res.data);
          if (res.data.length > 0 && !this.accountId) {
            this.accountId = res.data[0].id;
            if (res.data.length > 1 && !this.toAccountId) {
              this.toAccountId = res.data[1].id;
            }
          }
        }
      }
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
    this.amount = Math.abs(tx.amount);
    this.type = tx.type;
    this.category = tx.category;
    this.accountId = tx.accountId ?? '';
    this.toAccountId = tx.toAccountId ?? '';
    this.transferFee = tx.transferFee ?? 0;
    this.isSliderOpen.set(true);
  }

  closeSlider(): void {
    this.isSliderOpen.set(false);
    this.resetForm();
  }

  onSaved(): void {
    this.successMessage.set(this.isEditMode() ? 'Your transaction details have been updated!' : 'Got it! Your transaction has been recorded.');
    this.loadData();
  }

  handleDeleteTransaction(tx: Transaction): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.txToDelete.set(tx);
    this.isDeleteModalOpen.set(true);
  }

  executeDelete(): void {
    const tx = this.txToDelete();
    if (!tx) return;

    this.isLoading.set(true);
    this.http.delete(`${this.apiService.apiUrl}/transactions/${tx.id}`).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Transaction deleted successfully.');
        this.closeDeleteModal();
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || "Failed to delete the transaction. Let's try that again.");
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
    this.http.post(`${this.apiService.apiUrl}/transactions/bulk-delete`, { ids }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('All selected transactions have been deleted.');
        this.closeBulkDeleteModal();
        this.selectedIds.set(new Set());
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || "Failed to delete the selected transactions. Let's try that again.");
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
    this.transferFee = 0;
    this.type = 'EXPENSE';
    this.category = '';
    if (this.accounts().length > 0) {
      this.accountId = this.accounts()[0].id;
      if (this.accounts().length > 1) {
        this.toAccountId = this.accounts()[1].id;
      }
    }
  }

  openResetModal(): void {
    this.isResetModalOpen.set(true);
  }

  closeResetModal(): void {
    this.isResetModalOpen.set(false);
  }
}

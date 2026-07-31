import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiService, Account, RefAccountType } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { ResetPasswordComponent } from '../auth/reset-password/reset-password.component';
import { ConfirmDeleteModalComponent } from '../confirm-delete-modal/confirm-delete-modal.component';
import { AccountSliderComponent } from './account-slider.component';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [HeaderComponent, ResetPasswordComponent, ConfirmDeleteModalComponent, AccountSliderComponent, FormsModule, CurrencyPipe],
  templateUrl: './accounts.component.html'
})
export class AccountsComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  protected readonly accounts = signal<Account[]>([]);
  protected readonly accountTypes = signal<RefAccountType[]>([]);
  protected readonly isResetModalOpen = signal<boolean>(false);
  protected readonly isLoading = signal<boolean>(false);

  // Filter & Sort State
  protected readonly filterType = signal<string>('ALL');
  protected readonly sortBy = signal<string>('updatedDate_desc');

  // Slider State
  protected readonly isSliderOpen = signal<boolean>(false);
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly editingAccountId = signal<string | null>(null);

  // Form Fields for Slider
  protected name = '';
  protected type = 'CASH';
  protected balance: number | null = null;

  // Computed filtered & sorted accounts list
  protected readonly filteredAccounts = computed(() => {
    let list = [...this.accounts()];

    const typeFilter = this.filterType();
    if (typeFilter !== 'ALL') {
      list = list.filter(acc => acc.type === typeFilter);
    }

    const sortVal = this.sortBy();
    list.sort((a, b) => {
      if (sortVal === 'updatedDate_desc') {
        const da = a.updatedDate ? new Date(a.updatedDate).getTime() : 0;
        const db = b.updatedDate ? new Date(b.updatedDate).getTime() : 0;
        return db - da;
      }
      if (sortVal === 'updatedDate_asc') {
        const da = a.updatedDate ? new Date(a.updatedDate).getTime() : 0;
        const db = b.updatedDate ? new Date(b.updatedDate).getTime() : 0;
        return da - db;
      }
      if (sortVal === 'balance_desc') {
        return b.balance - a.balance;
      }
      if (sortVal === 'balance_asc') {
        return a.balance - b.balance;
      }
      return 0;
    });

    return list;
  });

  // Reusable Delete Modal State
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly accountToDelete = signal<Account | null>(null);

  protected successMessage = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadAccounts();
    this.loadAccountTypes();
  }

  loadAccounts(): void {
    const userId = this.authService.currentUser()?.id;
    this.apiService.getAccounts(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.accounts.set(res.data);
        }
      },
      error: (err) => console.warn('Failed to load accounts:', err)
    });
  }

  loadAccountTypes(): void {
    this.apiService.getAccountTypes().subscribe({
      next: (res) => {
        if (res.success) {
          this.accountTypes.set(res.data);
        }
      },
      error: () => {}
    });
  }

  onFilterTypeChange(val: string): void {
    this.filterType.set(val);
  }

  onSortByChange(val: string): void {
    this.sortBy.set(val);
  }

  openCreateSlider(): void {
    this.resetForm();
    this.isEditMode.set(false);
    this.editingAccountId.set(null);
    this.isSliderOpen.set(true);
  }

  startEdit(account: Account): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isEditMode.set(true);
    this.editingAccountId.set(account.id);
    this.name = account.name;
    this.type = account.type;
    this.balance = account.balance;
    this.isSliderOpen.set(true);
  }

  closeSlider(): void {
    this.isSliderOpen.set(false);
    this.resetForm();
  }

  onSaved(): void {
    this.successMessage.set(this.isEditMode() ? 'Your account details have been updated!' : 'Awesome, your new account is ready!');
    this.loadAccounts();
  }

  handleDeleteAccount(account: Account): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (account.balance !== 0) {
      this.errorMessage.set('We cannot delete an account that still has funds. Please transfer or withdraw the remaining balance first!');
      return;
    }

    this.accountToDelete.set(account);
    this.isDeleteModalOpen.set(true);
  }

  executeDelete(): void {
    const account = this.accountToDelete();
    if (!account) return;

    this.isLoading.set(true);
    this.http.delete(`${this.apiService.apiUrl}/accounts/${account.id}`).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Account deleted. All clean!');
        this.closeDeleteModal();
        this.loadAccounts();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || "Failed to delete account. Let's try that again.");
        this.closeDeleteModal();
      }
    });
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.accountToDelete.set(null);
  }

  resetForm(): void {
    this.name = '';
    this.type = 'CASH';
    this.balance = null;
  }

  openResetModal(): void {
    this.isResetModalOpen.set(true);
  }

  closeResetModal(): void {
    this.isResetModalOpen.set(false);
  }
}

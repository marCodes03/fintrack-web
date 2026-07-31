import { Component, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  RefIncomeCategory,
  RefExpenseCategory,
  RefSavingCategory,
  RefAccountType
} from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { ResetPasswordComponent } from '../auth/reset-password/reset-password.component';
import { ConfirmDeleteModalComponent } from '../confirm-delete-modal/confirm-delete-modal.component';
import { DatePipe } from '@angular/common';

type ActiveTab = 'income-categories' | 'expense-categories' | 'saving-categories' | 'account-types';
type SliderMode = 'create-income' | 'edit-income' | 'create-expense' | 'edit-expense' | 'create-saving' | 'edit-saving';

@Component({
  selector: 'app-references',
  standalone: true,
  imports: [HeaderComponent, ResetPasswordComponent, ConfirmDeleteModalComponent, FormsModule, DatePipe],
  templateUrl: './references.component.html'
})
export class ReferencesComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  protected readonly isResetModalOpen = signal<boolean>(false);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly activeTab = signal<ActiveTab>('income-categories');

  // Data signals
  protected readonly incomeCategories = signal<RefIncomeCategory[]>([]);
  protected readonly expenseCategories = signal<RefExpenseCategory[]>([]);
  protected readonly savingCategories = signal<RefSavingCategory[]>([]);
  protected readonly accountTypes = signal<RefAccountType[]>([]);

  // Slider Panel state
  protected readonly isSliderOpen = signal<boolean>(false);
  protected readonly sliderMode = signal<SliderMode>('create-income');
  protected readonly editingId = signal<string | null>(null);

  // Form fields
  protected formName = '';
  protected formDescription = '';
  protected formIsActive = true;

  // Messages
  protected successMessage = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);

  // Delete Modal
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly deleteTarget = signal<{ id: string; name: string; type: 'income' | 'expense' | 'saving' } | null>(null);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadAll();
  }

  loadAll(): void {
    this.loadIncomeCategories();
    this.loadExpenseCategories();
    this.loadSavingCategories();
    this.loadAccountTypes();
  }

  loadIncomeCategories(): void {
    this.apiService.getIncomeCategories().subscribe({
      next: (res) => { if (res.success) this.incomeCategories.set(res.data); },
      error: () => {}
    });
  }

  loadExpenseCategories(): void {
    this.apiService.getExpenseCategories().subscribe({
      next: (res) => { if (res.success) this.expenseCategories.set(res.data); },
      error: () => {}
    });
  }

  loadSavingCategories(): void {
    this.apiService.getSavingCategories().subscribe({
      next: (res) => { if (res.success) this.savingCategories.set(res.data); },
      error: () => {}
    });
  }

  loadAccountTypes(): void {
    this.apiService.getAccountTypes().subscribe({
      next: (res) => { if (res.success) this.accountTypes.set(res.data); },
      error: () => {}
    });
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    this.closeSlider();
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  // ---- INCOME CATEGORY CRUD ----

  openCreateIncomeSlider(): void {
    this.resetForm();
    this.sliderMode.set('create-income');
    this.isSliderOpen.set(true);
  }

  openEditIncomeSlider(item: RefIncomeCategory): void {
    this.resetForm();
    this.sliderMode.set('edit-income');
    this.editingId.set(item.id);
    this.formName = item.name;
    this.formDescription = item.description ?? '';
    this.formIsActive = item.isActive;
    this.isSliderOpen.set(true);
  }

  submitIncomeCategory(): void {
    if (!this.formName.trim()) {
      this.errorMessage.set('Category name is required.');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const body = { name: this.formName.trim(), description: this.formDescription.trim() || null, isActive: this.formIsActive };
    const mode = this.sliderMode();

    if (mode === 'create-income') {
      this.http.post(`${this.apiService.apiUrl}/refs/income-categories`, body).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.successMessage.set('Income category created successfully!');
          this.closeSlider();
          this.loadIncomeCategories();
        },
        error: (err) => { this.isLoading.set(false); this.errorMessage.set(err.error?.message || 'Failed to create.'); }
      });
    } else {
      const id = this.editingId();
      this.http.put(`${this.apiService.apiUrl}/refs/income-categories/${id}`, body).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.successMessage.set('Income category updated successfully!');
          this.closeSlider();
          this.loadIncomeCategories();
        },
        error: (err) => { this.isLoading.set(false); this.errorMessage.set(err.error?.message || 'Failed to update.'); }
      });
    }
  }

  promptDeleteIncomeCategory(item: RefIncomeCategory): void {
    this.deleteTarget.set({ id: item.id, name: item.name, type: 'income' });
    this.isDeleteModalOpen.set(true);
  }

  // ---- EXPENSE CATEGORY CRUD ----

  openCreateExpenseSlider(): void {
    this.resetForm();
    this.sliderMode.set('create-expense');
    this.isSliderOpen.set(true);
  }

  openEditExpenseSlider(item: RefExpenseCategory): void {
    this.resetForm();
    this.sliderMode.set('edit-expense');
    this.editingId.set(item.id);
    this.formName = item.name;
    this.formDescription = item.description ?? '';
    this.formIsActive = item.isActive;
    this.isSliderOpen.set(true);
  }

  submitExpenseCategory(): void {
    if (!this.formName.trim()) {
      this.errorMessage.set('Category name is required.');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const body = { name: this.formName.trim(), description: this.formDescription.trim() || null, isActive: this.formIsActive };
    const mode = this.sliderMode();

    if (mode === 'create-expense') {
      this.http.post(`${this.apiService.apiUrl}/refs/expense-categories`, body).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.successMessage.set('Expense category created successfully!');
          this.closeSlider();
          this.loadExpenseCategories();
        },
        error: (err) => { this.isLoading.set(false); this.errorMessage.set(err.error?.message || 'Failed to create.'); }
      });
    } else {
      const id = this.editingId();
      this.http.put(`${this.apiService.apiUrl}/refs/expense-categories/${id}`, body).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.successMessage.set('Expense category updated successfully!');
          this.closeSlider();
          this.loadExpenseCategories();
        },
        error: (err) => { this.isLoading.set(false); this.errorMessage.set(err.error?.message || 'Failed to update.'); }
      });
    }
  }

  promptDeleteExpenseCategory(item: RefExpenseCategory): void {
    this.deleteTarget.set({ id: item.id, name: item.name, type: 'expense' });
    this.isDeleteModalOpen.set(true);
  }

  // ---- SAVING CATEGORY CRUD ----

  openCreateSavingSlider(): void {
    this.resetForm();
    this.sliderMode.set('create-saving');
    this.isSliderOpen.set(true);
  }

  openEditSavingSlider(item: RefSavingCategory): void {
    this.resetForm();
    this.sliderMode.set('edit-saving');
    this.editingId.set(item.id);
    this.formName = item.name;
    this.formDescription = item.description ?? '';
    this.formIsActive = item.isActive;
    this.isSliderOpen.set(true);
  }

  submitSavingCategory(): void {
    if (!this.formName.trim()) {
      this.errorMessage.set('Category name is required.');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const body = { name: this.formName.trim(), description: this.formDescription.trim() || null, isActive: this.formIsActive };
    const mode = this.sliderMode();

    if (mode === 'create-saving') {
      this.http.post(`${this.apiService.apiUrl}/refs/saving-categories`, body).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.successMessage.set('Saving category created successfully!');
          this.closeSlider();
          this.loadSavingCategories();
        },
        error: (err) => { this.isLoading.set(false); this.errorMessage.set(err.error?.message || 'Failed to create.'); }
      });
    } else {
      const id = this.editingId();
      this.http.put(`${this.apiService.apiUrl}/refs/saving-categories/${id}`, body).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.successMessage.set('Saving category updated successfully!');
          this.closeSlider();
          this.loadSavingCategories();
        },
        error: (err) => { this.isLoading.set(false); this.errorMessage.set(err.error?.message || 'Failed to update.'); }
      });
    }
  }

  promptDeleteSavingCategory(item: RefSavingCategory): void {
    this.deleteTarget.set({ id: item.id, name: item.name, type: 'saving' });
    this.isDeleteModalOpen.set(true);
  }

  // ---- DELETE EXECUTION ----
  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.isLoading.set(true);
    let url = '';
    if (target.type === 'income') {
      url = `${this.apiService.apiUrl}/refs/income-categories/${target.id}`;
    } else if (target.type === 'expense') {
      url = `${this.apiService.apiUrl}/refs/expense-categories/${target.id}`;
    } else {
      url = `${this.apiService.apiUrl}/refs/saving-categories/${target.id}`;
    }

    this.http.delete(url).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`"${target.name}" deleted successfully.`);
        this.closeDeleteModal();
        if (target.type === 'income') this.loadIncomeCategories();
        else if (target.type === 'expense') this.loadExpenseCategories();
        else this.loadSavingCategories();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to delete.');
        this.closeDeleteModal();
      }
    });
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deleteTarget.set(null);
  }

  // ---- HELPERS ----
  closeSlider(): void {
    this.isSliderOpen.set(false);
    this.resetForm();
  }

  resetForm(): void {
    this.formName = '';
    this.formDescription = '';
    this.formIsActive = true;
    this.editingId.set(null);
  }

  getSliderTitle(): string {
    const m = this.sliderMode();
    if (m === 'create-income') return '+ New Income Category';
    if (m === 'edit-income') return 'Edit Income Category';
    if (m === 'create-expense') return '+ New Expense Category';
    if (m === 'edit-expense') return 'Edit Expense Category';
    if (m === 'create-saving') return '+ New Saving Category';
    if (m === 'edit-saving') return 'Edit Saving Category';
    return 'Category Form';
  }

  isIncomeMode(): boolean {
    return this.sliderMode() === 'create-income' || this.sliderMode() === 'edit-income';
  }

  isSavingMode(): boolean {
    return this.sliderMode() === 'create-saving' || this.sliderMode() === 'edit-saving';
  }

  openResetModal(): void { this.isResetModalOpen.set(true); }
  closeResetModal(): void { this.isResetModalOpen.set(false); }
}

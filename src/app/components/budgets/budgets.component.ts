import { Component, signal, inject, OnInit, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiService, BudgetPlan, Account, BudgetGoal, BudgetGoalGroup } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { ResetPasswordComponent } from '../auth/reset-password/reset-password.component';
import { ConfirmDeleteModalComponent } from '../confirm-delete-modal/confirm-delete-modal.component';
import { BudgetPlanSliderComponent } from './budget-plan-slider.component';
import { CurrencyPipe, DatePipe, DecimalPipe, KeyValuePipe } from '@angular/common';

export interface BudgetPlanItem {
  id?: string;
  type: 'INCOME' | 'EXPENSE' | 'SAVINGS' | 'TRANSFER';
  categoryName: string;
  amount: number;
  accountId?: string;
  toAccountId?: string;
  transferFee?: number;
}

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [HeaderComponent, ResetPasswordComponent, ConfirmDeleteModalComponent, BudgetPlanSliderComponent, FormsModule, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './budgets.component.html'
})
export class BudgetsComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  protected readonly budgetPlans = signal<BudgetPlan[]>([]);
  protected readonly itemsToShow = signal<number>(10);

  protected readonly paginatedPlans = computed(() => {
    return this.budgetPlans().slice(0, this.itemsToShow());
  });

  onContainerScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const pos = target.scrollTop + target.clientHeight;
    const max = target.scrollHeight;
    if (pos >= max - 50) {
      this.loadMore();
    }
  }

  protected loadMore(): void {
    if (this.itemsToShow() < this.budgetPlans().length) {
      this.itemsToShow.update(val => val + 10);
    }
  }

  protected readonly accounts = signal<Account[]>([]);
  protected readonly Math = Math;
  protected readonly isResetModalOpen = signal<boolean>(false);
  protected readonly isLoading = signal<boolean>(true);

  // Slider State
  protected readonly isSliderOpen = signal<boolean>(false);
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly editingPlanId = signal<string | null>(null);

  // Confirm Delete Modal state
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly planToDelete = signal<BudgetPlan | null>(null);

  // Deactivate Modal state
  protected readonly isDeactivateModalOpen = signal<boolean>(false);
  protected readonly planToDeactivate = signal<BudgetPlan | null>(null);

  // Budget Goal / Baseline state
  protected readonly budgetGoal = signal<BudgetGoal | null>(null);
  protected readonly isEditingGoal = signal<boolean>(false);
  protected readonly goalGroupsEdit = signal<BudgetGoalGroup[]>([]);
  protected readonly expenseCategories = signal<any[]>([]);
  protected readonly savingCategories = signal<any[]>([]);
  protected readonly activeGoalTab = signal<number>(0);
  protected readonly activeDisplayGoalTab = signal<number>(0);
  protected userMonthlySavingsGoal = signal<number>(0);

  // Implement Plan Modal state
  protected readonly isImplementModalOpen = signal<boolean>(false);
  protected readonly implementPlanId = signal<string | null>(null);
  protected readonly implementPlanName = signal<string>('');
  protected implementStartDate = new Date().toISOString().split('T')[0];
  protected implementEndDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  protected implementAccountId = '';
  protected implementExpenseAccountId = '';
  protected implementSavingsAccountId = '';
  protected implementExecute = true;

  private implementPlanTimeframe: { startDay: number; endDay: number } | null = null;

  protected successMessage = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);


  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadData();
  }

  loadData(): void {
    const userId = this.authService.currentUser()?.id;
    
    if (userId) {
      this.apiService.getSavingsGoal(userId).subscribe({
        next: (res) => {
          if (res.success) {
            this.userMonthlySavingsGoal.set(res.monthlySavingsGoal || 0);
          }
        }
      });
    }

    this.isLoading.set(true);
    this.apiService.getBudgetPlans(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.budgetPlans.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.warn('Failed to load budget plans:', err);
        this.isLoading.set(false);
      }
    });

    this.apiService.getAccounts(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.accounts.set(res.data);
          if (res.data.length > 0 && !this.implementAccountId) {
            this.implementAccountId = res.data[0].id;
          }
        }
      }
    });

    if (userId) {
      this.apiService.getBudgetGoal(userId).subscribe({
        next: (res) => {
          if (res.success) {
            this.budgetGoal.set(res.data);
          }
        }
      });
    }

    this.apiService.getExpenseCategories().subscribe({
      next: (res) => {
        if (res.success) this.expenseCategories.set(res.data.filter(c => c.isActive));
      }
    });

    this.apiService.getSavingCategories().subscribe({
      next: (res) => {
        if (res.success) this.savingCategories.set(res.data.filter(c => c.isActive));
      }
    });
  }


  getPlannedInflows(plan: BudgetPlan): number {
    return (plan.items || [])
      .filter(i => i.type === 'INCOME')
      .reduce((sum, i) => sum + i.amount, 0);
  }

  getPlannedOutflows(plan: BudgetPlan): number {
    return (plan.items || [])
      .filter(i => i.type === 'EXPENSE')
      .reduce((sum, i) => sum + i.amount, 0);
  }

  getPlannedSavings(plan: BudgetPlan): number {
    return (plan.items || [])
      .filter(i => i.type === 'SAVINGS')
      .reduce((sum, i) => sum + i.amount, 0);
  }

  getRemainingBudget(plan: BudgetPlan): number {
    return this.getPlannedInflows(plan) - this.getPlannedOutflows(plan);
  }

  openCreateSlider(): void {
    this.isEditMode.set(false);
    this.editingPlanId.set(null);
    this.isSliderOpen.set(true);
  }

  startEdit(plan: BudgetPlan): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isEditMode.set(true);
    this.editingPlanId.set(plan.id);
    this.isSliderOpen.set(true);
  }

  closeSlider(): void {
    this.isSliderOpen.set(false);
  }

  onSaved(): void {
    this.successMessage.set(this.isEditMode() ? 'Your budget plan has been updated!' : 'Awesome, your new budget plan is ready!');
    this.loadData();
  }

  // Implementation Modal methods
  openImplementModal(plan: BudgetPlan): void {
    this.implementPlanId.set(plan.id);
    this.implementPlanName.set(plan.name);
    
    let startDay = 1;
    let endDay = 15;
    try {
      const config = JSON.parse(plan.timeframe);
      const details = config.details || {};
      startDay = details.startDay || 1;
      endDay = details.endDay || 15;
    } catch (e) {
      console.error('Failed to parse timeframe config', e);
    }
    this.implementPlanTimeframe = { startDay, endDay };

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11

    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const startDateObj = new Date(year, month, startDay);
    let endDateObj: Date;
    if (endDay >= startDay) {
      endDateObj = new Date(year, month, endDay);
    } else {
      endDateObj = new Date(year, month + 1, endDay);
    }

    this.implementStartDate = formatLocalDate(startDateObj);
    this.implementEndDate = formatLocalDate(endDateObj);

    if (this.accounts().length > 0) {
      if (!this.implementAccountId) this.implementAccountId = this.accounts()[0].id;
      if (!this.implementExpenseAccountId) this.implementExpenseAccountId = this.accounts()[0].id;
      if (!this.implementSavingsAccountId) this.implementSavingsAccountId = this.accounts()[0].id;
    }
    this.isImplementModalOpen.set(true);
  }

  onStartDateChange(newDateStr: string): void {
    if (!newDateStr || !this.implementPlanTimeframe) return;
    try {
      const { startDay, endDay } = this.implementPlanTimeframe;
      const parts = newDateStr.split('-');
      if (parts.length !== 3) return;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const d1 = new Date(2026, 0, startDay);
      let d2 = new Date(2026, 0, endDay);
      if (endDay < startDay) {
        d2 = new Date(2026, 1, endDay);
      }
      const durationMs = d2.getTime() - d1.getTime();

      const newStart = new Date(year, month, day);
      const newEnd = new Date(newStart.getTime() + durationMs);

      const formatLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dy = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dy}`;
      };

      this.implementEndDate = formatLocalDate(newEnd);
    } catch (e) {
      console.error(e);
    }
  }

  closeImplementModal(): void {
    this.isImplementModalOpen.set(false);
    this.implementPlanId.set(null);
    this.implementExecute = true;
    this.implementPlanTimeframe = null;
  }

  executeImplementPlan(): void {
    const planId = this.implementPlanId();
    if (!planId || !this.implementStartDate) {
      this.errorMessage.set('Please select a start date to activate the plan.');
      return;
    }

    if (!this.implementEndDate) {
      this.onStartDateChange(this.implementStartDate);
    }

    if (!this.implementEndDate) {
      this.errorMessage.set('Could not calculate the end date for the plan. Please check the plan timeframe.');
      return;
    }

    const userId = this.authService.currentUser()?.id || '';
    const defaultAccId = this.accounts().length > 0 ? this.accounts()[0].id : '';
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      startDate: this.implementStartDate,
      endDate: this.implementEndDate,
      accountId: this.implementAccountId || defaultAccId,
      userId,
      execute: this.implementExecute
    };

    this.apiService.implementBudgetPlan(planId, payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const actionMsg = this.implementExecute ? 
          'Actual transactions created for income, fixed expenses, and savings.' : 
          'Plan applied/activated only (transactions were not executed).';
        this.successMessage.set(`Your budget plan is now active for the period of ${this.implementStartDate} to ${this.implementEndDate}! ${actionMsg}`);
        this.closeImplementModal();
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || "Failed to activate the budget plan. Let's try that again.");
      }
    });
  }

  handleDeletePlan(plan: BudgetPlan): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.planToDelete.set(plan);
    this.isDeleteModalOpen.set(true);
  }

  executeDelete(): void {
    const plan = this.planToDelete();
    if (!plan) return;

    this.isLoading.set(true);
    this.http.delete(`${this.apiService.apiUrl}/budget-plans/${plan.id}`).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Budget plan deleted. All clean!');
        this.closeDeleteModal();
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || "Failed to delete the budget plan. Let's try that again.");
        this.closeDeleteModal();
      }
    });
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.planToDelete.set(null);
  }

  // Deactivation Handlers
  openDeactivateModal(plan: BudgetPlan): void {
    this.planToDeactivate.set(plan);
    this.isDeactivateModalOpen.set(true);
  }

  closeDeactivateModal(): void {
    this.isDeactivateModalOpen.set(false);
    this.planToDeactivate.set(null);
  }

  executeDeactivatePlan(): void {
    const plan = this.planToDeactivate();
    if (!plan) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.apiService.deactivateBudgetPlan(plan.id).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set("Your budget plan has been deactivated. Don't worry, your existing transactions are safe and intact!");
        this.closeDeactivateModal();
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || "Failed to deactivate the budget plan. Let's try that again.");
        this.closeDeactivateModal();
      }
    });
  }

  getSavingsGoalPercentage(): number {
    const goal = this.userMonthlySavingsGoal();
    if (goal <= 0) return 0;
    
    const activePlan = this.budgetPlans().find(p => p.isActive) || this.budgetPlans()[0];
    const inflows = activePlan ? this.getPlannedInflows(activePlan) : 0;
    if (inflows > 0) {
      return Number(((goal / inflows) * 100).toFixed(2));
    }
    return 20; // default baseline percentage if no active plan inflows exist
  }

  getCategoryOwnerGroup(category: string): string | null {
    const group = this.goalGroupsEdit().find(g => g.name.toLowerCase() !== 'others' && (g.categories || []).includes(category));
    return group ? group.name : null;
  }

  onPercentageChange(group: BudgetGoalGroup, value: number): void {
    const groups = this.goalGroupsEdit();
    let totalOther = 0;
    groups.forEach(g => {
      if (g !== group && g.name.toLowerCase() !== 'others') {
        totalOther += g.percentage;
      }
    });

    const maxAllowed = Number((100 - totalOther).toFixed(2));
    if (value > maxAllowed) {
      group.percentage = maxAllowed;
    } else if (value < 0) {
      group.percentage = 0;
    } else {
      group.percentage = Number(value.toFixed(2));
    }
    this.enforceOthersGroup();
  }

  // Budget Goal / Baseline Handlers
  startEditGoal(): void {
    const currentGoal = this.budgetGoal();
    if (currentGoal) {
      this.goalGroupsEdit.set(currentGoal.groups.map(g => ({
        ...g,
        categories: [...(g.categories || [])]
      })));
    } else {
      this.goalGroupsEdit.set([
        { name: 'Necessity', percentage: 50, categories: ['Food & Dining', 'Transportation', 'Utilities', 'Housing & Rent', 'Health & Medical', 'Education'] },
        { name: 'Wants', percentage: 10, categories: ['Entertainment & Leisure', 'Shopping', 'Miscellaneous'] },
        { name: 'Savings', percentage: 25, categories: ['Savings'] }
      ]);
    }
    
    // Ensure Savings Goal alignment
    const savingsGroup = this.goalGroupsEdit().find(g => g.name.toLowerCase() === 'savings');
    const savingsPct = this.getSavingsGoalPercentage();
    if (savingsGroup && savingsPct > 0) {
       savingsGroup.percentage = savingsPct;
    }

    this.enforceOthersGroup();
    this.activeGoalTab.set(0);
    this.isEditingGoal.set(true);
  }

  cancelEditGoal(): void {
    this.isEditingGoal.set(false);
    this.goalGroupsEdit.set([]);
  }
  
  setActiveTab(index: number): void {
     this.activeGoalTab.set(index);
  }

  enforceOthersGroup(): void {
     const groups = [...this.goalGroupsEdit()];
     
     // Enforce savings goal
     const savingsGroup = groups.find(g => g.name.toLowerCase() === 'savings');
     const savingsPct = this.getSavingsGoalPercentage();
     if (savingsGroup && savingsPct > 0) {
        savingsGroup.percentage = savingsPct;
     }

     let othersIndex = groups.findIndex(g => g.name.toLowerCase() === 'others');
     
     let totalPercentage = 0;
     let allAssignedCategories: string[] = [];
     
     groups.forEach((g, i) => {
        if (i !== othersIndex) {
           totalPercentage += g.percentage;
           allAssignedCategories = [...allAssignedCategories, ...(g.categories || [])];
        }
     });
     
     const remainingPercentage = Number(Math.max(0, 100 - totalPercentage).toFixed(2));
     
     // Find unassigned categories
     const unassignedCategories = this.expenseCategories().map(c => c.name).filter(c => !allAssignedCategories.includes(c));
     
     if (othersIndex === -1) {
        groups.push({ name: 'Others', percentage: remainingPercentage, categories: unassignedCategories });
     } else {
        groups[othersIndex].percentage = remainingPercentage;
        groups[othersIndex].categories = unassignedCategories;
     }
     
     this.goalGroupsEdit.set(groups);
  }

  saveBudgetGoal(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.enforceOthersGroup();

    const totalPercentage = this.goalGroupsEdit().reduce((sum, g) => sum + g.percentage, 0);
    if (totalPercentage !== 100) {
      this.errorMessage.set(`Your allocations add up to ${totalPercentage}%. Please adjust them so they equal exactly 100%.`);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.apiService.updateBudgetGoal(userId, this.goalGroupsEdit()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set('Your baseline budget goal targets have been updated successfully!');
        this.budgetGoal.set(res.data);
        this.isEditingGoal.set(false);
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || "Failed to update the baseline budget goal. Let's try that again.");
      }
    });
  }

  toggleCategoryInGroup(group: BudgetGoalGroup, category: string): void {
    if (group.name.toLowerCase() === 'others') return; // Others is auto-managed
    
    const categories = group.categories || [];
    const index = categories.indexOf(category);
    if (index === -1) {
      // Unassign from all other groups first
      this.goalGroupsEdit.update(groups => {
        return groups.map(g => {
          if (g !== group && g.name.toLowerCase() !== 'others') {
            return {
              ...g,
              categories: (g.categories || []).filter(c => c !== category)
            };
          }
          return g;
        });
      });
      group.categories = [...categories, category];
    } else {
      group.categories = categories.filter(c => c !== category);
    }
    this.enforceOthersGroup();
  }

  isCategoryInGroup(group: BudgetGoalGroup, category: string): boolean {
    return (group.categories || []).includes(category);
  }

  addGroup(): void {
    this.goalGroupsEdit.update(groups => [
      ...groups,
      { name: 'New Group', percentage: 0, categories: [] }
    ]);
    this.enforceOthersGroup();
    this.activeGoalTab.set(this.goalGroupsEdit().length - 1);
  }

  removeGroup(index: number): void {
    this.goalGroupsEdit.update(groups => groups.filter((_, i) => i !== index));
    if (this.activeGoalTab() >= index && this.activeGoalTab() > 0) {
       this.activeGoalTab.set(this.activeGoalTab() - 1);
    }
    this.enforceOthersGroup();
  }

  openResetModal(): void {
    this.isResetModalOpen.set(true);
  }


  closeResetModal(): void {
    this.isResetModalOpen.set(false);
  }
}

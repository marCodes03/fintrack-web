import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ApiService, Account } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { BudgetPlanItem } from './budgets.component';

@Component({
  selector: 'app-budget-plan-slider',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './budget-plan-slider.component.html'
})
export class BudgetPlanSliderComponent {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private _isOpen = false;
  @Input()
  set isOpen(value: boolean) {
    this._isOpen = value;
    if (value) {
      this.loadCategories();
    }
  }
  get isOpen(): boolean {
    return this._isOpen;
  }

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
    if (value) {
      this.loadPlanForEditing(value);
    } else {
      this.resetForm();
    }
  }
  get editingId(): string | null {
    return this._editingId;
  }

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  // Categories & Accounts lists
  protected incomeCategories = signal<any[]>([]);
  protected expenseCategories = signal<any[]>([]);
  protected savingCategories = signal<any[]>([]);
  protected accounts = signal<Account[]>([]);

  protected activeTab = signal<number>(1);

  // Form states
  protected planName = '';

  // Time Period Date configuration (1-30 Days)
  protected startDay = 1;
  protected endDay = 30;
  protected daysArray = Array.from({ length: 30 }, (_, i) => i + 1);

  protected planItems = signal<BudgetPlanItem[]>([]);

  // Subform fields per Step
  // Step 2: Inflows
  protected newIncomeCategory = '';
  protected newIncomeAmount: number | null = null;
  protected newIncomeAccountId = '';

  // Step 3: Internal Transfers
  protected newTransferCategory = '';
  protected newTransferSourceAccountId = '';
  protected newTransferDestAccountId = '';
  protected newTransferAmount: number | null = null;
  protected newTransferTransferFee: number | null = null;

  // Step 4: Planned Savings
  protected newSavingsCategory = '';
  protected newSavingsSourceAccountId = '';
  protected newSavingsDestAccountId = '';
  protected newSavingsAmount: number | null = null;
  protected newSavingsTransferFee: number | null = null;

  // Step 5: Outflows / Expenses
  protected newOutflowCategory = '';
  protected newOutflowAccountId = '';
  protected newOutflowAmount: number | null = null;

  // Editing state per step item
  protected editingIncomeItem = signal<BudgetPlanItem | null>(null);
  protected editingTransferItem = signal<BudgetPlanItem | null>(null);
  protected editingSavingsItem = signal<BudgetPlanItem | null>(null);
  protected editingOutflowItem = signal<BudgetPlanItem | null>(null);

  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadCategories();
  }

  get nonCreditAccounts(): Account[] {
    return this.accounts().filter(a => a.type !== 'CREDIT');
  }

  get validEndDayOptions(): number[] {
    return this.daysArray.filter(day => day > this.startDay);
  }

  onStartDayChange(): void {
    if (this.endDay <= this.startDay) {
      const valid = this.validEndDayOptions;
      this.endDay = valid.length > 0 ? valid[valid.length - 1] : 30;
    }
  }

  get timePeriodLabel(): string {
    if (this.startDay === 1 && this.endDay === 30) {
      return 'Monthly (Day 1 - 30)';
    }
    return `Day ${this.startDay} - Day ${this.endDay}`;
  }

  loadCategories(): void {
    const userId = this.authService.currentUser()?.id;

    this.apiService.getAccounts(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.accounts.set(res.data);
          const nonCredit = res.data.filter(a => a.type !== 'CREDIT');
          if (nonCredit.length > 0) {
            const firstId = nonCredit[0].id;
            const secondId = nonCredit.length > 1 ? nonCredit[1].id : firstId;
            if (!this.newIncomeAccountId) this.newIncomeAccountId = firstId;
            if (!this.newTransferSourceAccountId) this.newTransferSourceAccountId = firstId;
            if (!this.newTransferDestAccountId) this.newTransferDestAccountId = secondId;
            if (!this.newSavingsSourceAccountId) this.newSavingsSourceAccountId = firstId;
            if (!this.newSavingsDestAccountId) this.newSavingsDestAccountId = secondId;
            if (!this.newOutflowAccountId) this.newOutflowAccountId = firstId;
          }
        }
      }
    });

    this.apiService.getIncomeCategories().subscribe({
      next: (res) => {
        if (res.success) {
          const active = res.data.filter(c => c.isActive);
          this.incomeCategories.set(active);
          if (active.length > 0 && !this.newIncomeCategory) {
            this.newIncomeCategory = active[0].name;
          }
        }
      }
    });

    this.apiService.getExpenseCategories().subscribe({
      next: (res) => {
        if (res.success) {
          const active = res.data.filter(c => c.isActive);
          this.expenseCategories.set(active);
          if (active.length > 0 && !this.newOutflowCategory) {
            this.newOutflowCategory = active[0].name;
          }
        }
      }
    });

    this.apiService.getSavingCategories().subscribe({
      next: (res) => {
        if (res.success) {
          const active = res.data.filter(c => c.isActive);
          this.savingCategories.set(active);
          if (active.length > 0 && !this.newSavingsCategory) {
            this.newSavingsCategory = active[0].name;
          }
        }
      }
    });
  }

  getAccountName(accountId?: string): string {
    if (!accountId) return 'N/A';
    const acc = this.accounts().find(a => a.id === accountId);
    return acc ? acc.name : 'N/A';
  }

  // Virtual Account Balance Engine (₱0.00 baseline for NON-CREDIT accounts)
  get virtualAccountBalances(): { [accountId: string]: number } {
    const balances: { [accountId: string]: number } = {};
    for (const acc of this.nonCreditAccounts) {
      balances[acc.id] = 0;
    }

    for (const item of this.planItems()) {
      const amt = item.amount || 0;
      const fee = item.transferFee || 0;
      if (item.type === 'INCOME') {
        if (item.accountId && balances[item.accountId] !== undefined) {
          balances[item.accountId] += amt;
        }
      } else if (item.type === 'TRANSFER' || item.type === 'SAVINGS') {
        if (item.accountId && balances[item.accountId] !== undefined) {
          balances[item.accountId] -= (amt + fee);
        }
        if (item.toAccountId && balances[item.toAccountId] !== undefined) {
          balances[item.toAccountId] += amt;
        }
      } else if (item.type === 'EXPENSE') {
        if (item.accountId && balances[item.accountId] !== undefined) {
          balances[item.accountId] -= amt;
        }
      }
    }
    return balances;
  }

  getVirtualBalance(accountId: string): number {
    const balances = this.virtualAccountBalances;
    return balances[accountId] !== undefined ? balances[accountId] : 0;
  }

  // Step 2: Add or Update Inflow Item
  editIncomeItem(item: BudgetPlanItem): void {
    this.editingIncomeItem.set(item);
    this.newIncomeCategory = item.categoryName;
    this.newIncomeAccountId = item.accountId || '';
    this.newIncomeAmount = item.amount;
  }

  cancelIncomeEdit(): void {
    this.editingIncomeItem.set(null);
    this.newIncomeAmount = null;
  }

  addIncomeItem(): void {
    if (!this.newIncomeCategory || !this.newIncomeAmount || this.newIncomeAmount <= 0 || !this.newIncomeAccountId) {
      this.errorMessage.set('Please pick a category, choose an account, and enter an amount greater than zero.');
      return;
    }

    const editTarget = this.editingIncomeItem();
    if (editTarget) {
      const updatedList = this.planItems().map(item => {
        if (item === editTarget) {
          return {
            ...item,
            categoryName: this.newIncomeCategory,
            amount: this.newIncomeAmount!,
            accountId: this.newIncomeAccountId
          };
        }
        return item;
      });
      this.planItems.set(updatedList);
      this.cancelIncomeEdit();
      this.errorMessage.set(null);
      return;
    }

    const newItem: BudgetPlanItem = {
      type: 'INCOME',
      categoryName: this.newIncomeCategory,
      amount: this.newIncomeAmount,
      accountId: this.newIncomeAccountId
    };

    this.planItems.set([...this.planItems(), newItem]);
    this.newIncomeAmount = null;
    this.errorMessage.set(null);
  }

  // Step 3: Add or Update Internal Transfer Item with Guardrail
  editTransferItem(item: BudgetPlanItem): void {
    this.editingTransferItem.set(item);
    this.newTransferCategory = item.categoryName;
    this.newTransferSourceAccountId = item.accountId || '';
    this.newTransferDestAccountId = item.toAccountId || '';
    this.newTransferAmount = item.amount;
    this.newTransferTransferFee = item.transferFee || null;
  }

  cancelTransferEdit(): void {
    this.editingTransferItem.set(null);
    this.newTransferAmount = null;
    this.newTransferTransferFee = null;
    this.newTransferCategory = '';
  }

  addTransferItem(): void {
    if (!this.newTransferSourceAccountId || !this.newTransferDestAccountId || !this.newTransferAmount || this.newTransferAmount <= 0) {
      this.errorMessage.set('Please choose a source account, a destination account, and enter a positive amount.');
      return;
    }

    if (this.newTransferSourceAccountId === this.newTransferDestAccountId) {
      this.errorMessage.set('The source and destination accounts must be different.');
      return;
    }

    const fee = this.newTransferTransferFee || 0;
    const required = this.newTransferAmount + fee;
    let avail = this.getVirtualBalance(this.newTransferSourceAccountId);

    const editTarget = this.editingTransferItem();
    if (editTarget && editTarget.accountId === this.newTransferSourceAccountId) {
      avail += (editTarget.amount + (editTarget.transferFee || 0));
    }

    if (required > avail) {
      const accName = this.getAccountName(this.newTransferSourceAccountId);
      const formattedBal = avail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      this.errorMessage.set(`Oops, there aren't enough funds in ${accName}. You currently have ₱${formattedBal} available.`);
      return;
    }

    const defaultTitle = this.newTransferCategory || 'Internal Transfer';

    if (editTarget) {
      const updatedList = this.planItems().map(item => {
        if (item === editTarget) {
          return {
            ...item,
            categoryName: defaultTitle,
            amount: this.newTransferAmount!,
            accountId: this.newTransferSourceAccountId,
            toAccountId: this.newTransferDestAccountId,
            transferFee: fee > 0 ? fee : undefined
          };
        }
        return item;
      });
      this.planItems.set(updatedList);
      this.cancelTransferEdit();
      this.errorMessage.set(null);
      return;
    }

    const newItem: BudgetPlanItem = {
      type: 'TRANSFER',
      categoryName: defaultTitle,
      amount: this.newTransferAmount,
      accountId: this.newTransferSourceAccountId,
      toAccountId: this.newTransferDestAccountId,
      transferFee: fee > 0 ? fee : undefined
    };

    this.planItems.set([...this.planItems(), newItem]);
    this.newTransferAmount = null;
    this.newTransferTransferFee = null;
    this.newTransferCategory = '';
    this.errorMessage.set(null);
  }

  // Step 4: Add or Update Savings Item with Guardrail
  editSavingsItem(item: BudgetPlanItem): void {
    this.editingSavingsItem.set(item);
    this.newSavingsCategory = item.categoryName;
    this.newSavingsSourceAccountId = item.accountId || '';
    this.newSavingsDestAccountId = item.toAccountId || '';
    this.newSavingsAmount = item.amount;
    this.newSavingsTransferFee = item.transferFee || null;
  }

  cancelSavingsEdit(): void {
    this.editingSavingsItem.set(null);
    this.newSavingsAmount = null;
    this.newSavingsTransferFee = null;
    this.newSavingsCategory = '';
  }

  addSavingsItem(): void {
    if (!this.newSavingsSourceAccountId || !this.newSavingsDestAccountId || !this.newSavingsAmount || this.newSavingsAmount <= 0) {
      this.errorMessage.set('Please choose a source account, a destination account, and enter a positive amount.');
      return;
    }

    if (this.newSavingsSourceAccountId === this.newSavingsDestAccountId) {
      this.errorMessage.set('The source and destination accounts must be different.');
      return;
    }

    const fee = this.newSavingsTransferFee || 0;
    const required = this.newSavingsAmount + fee;
    let avail = this.getVirtualBalance(this.newSavingsSourceAccountId);

    const editTarget = this.editingSavingsItem();
    if (editTarget && editTarget.accountId === this.newSavingsSourceAccountId) {
      avail += (editTarget.amount + (editTarget.transferFee || 0));
    }

    if (required > avail) {
      const accName = this.getAccountName(this.newSavingsSourceAccountId);
      const formattedBal = avail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      this.errorMessage.set(`Oops, there aren't enough funds in ${accName}. You currently have ₱${formattedBal} available.`);
      return;
    }

    const defaultTitle = this.newSavingsCategory || 'Savings Deposit';

    if (editTarget) {
      const updatedList = this.planItems().map(item => {
        if (item === editTarget) {
          return {
            ...item,
            categoryName: defaultTitle,
            amount: this.newSavingsAmount!,
            accountId: this.newSavingsSourceAccountId,
            toAccountId: this.newSavingsDestAccountId,
            transferFee: fee > 0 ? fee : undefined
          };
        }
        return item;
      });
      this.planItems.set(updatedList);
      this.cancelSavingsEdit();
      this.errorMessage.set(null);
      return;
    }

    const newItem: BudgetPlanItem = {
      type: 'SAVINGS',
      categoryName: defaultTitle,
      amount: this.newSavingsAmount,
      accountId: this.newSavingsSourceAccountId,
      toAccountId: this.newSavingsDestAccountId,
      transferFee: fee > 0 ? fee : undefined
    };

    this.planItems.set([...this.planItems(), newItem]);
    this.newSavingsAmount = null;
    this.newSavingsTransferFee = null;
    this.newSavingsCategory = '';
    this.errorMessage.set(null);
  }

  // Step 5: Add or Update Outflow / Expense Item with Guardrail
  editOutflowItem(item: BudgetPlanItem): void {
    this.editingOutflowItem.set(item);
    this.newOutflowCategory = item.categoryName;
    this.newOutflowAccountId = item.accountId || '';
    this.newOutflowAmount = item.amount;
  }

  cancelOutflowEdit(): void {
    this.editingOutflowItem.set(null);
    this.newOutflowAmount = null;
  }

  addOutflowItem(): void {
    if (!this.newOutflowCategory || !this.newOutflowAmount || this.newOutflowAmount <= 0 || !this.newOutflowAccountId) {
      this.errorMessage.set('Please pick a category, choose an account, and enter an amount greater than zero.');
      return;
    }

    let avail = this.getVirtualBalance(this.newOutflowAccountId);

    const editTarget = this.editingOutflowItem();
    if (editTarget && editTarget.accountId === this.newOutflowAccountId) {
      avail += editTarget.amount;
    }

    if (this.newOutflowAmount > avail) {
      const accName = this.getAccountName(this.newOutflowAccountId);
      const formattedBal = avail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      this.errorMessage.set(`Oops, there aren't enough funds in ${accName}. You currently have ₱${formattedBal} available.`);
      return;
    }

    if (editTarget) {
      const updatedList = this.planItems().map(item => {
        if (item === editTarget) {
          return {
            ...item,
            categoryName: this.newOutflowCategory,
            amount: this.newOutflowAmount!,
            accountId: this.newOutflowAccountId
          };
        }
        return item;
      });
      this.planItems.set(updatedList);
      this.cancelOutflowEdit();
      this.errorMessage.set(null);
      return;
    }

    const newItem: BudgetPlanItem = {
      type: 'EXPENSE',
      categoryName: this.newOutflowCategory,
      amount: this.newOutflowAmount,
      accountId: this.newOutflowAccountId
    };

    this.planItems.set([...this.planItems(), newItem]);
    this.newOutflowAmount = null;
    this.errorMessage.set(null);
  }

  removePlanItem(itemToRemove: BudgetPlanItem): void {
    if (this.editingIncomeItem() === itemToRemove) this.cancelIncomeEdit();
    if (this.editingTransferItem() === itemToRemove) this.cancelTransferEdit();
    if (this.editingSavingsItem() === itemToRemove) this.cancelSavingsEdit();
    if (this.editingOutflowItem() === itemToRemove) this.cancelOutflowEdit();
    const items = this.planItems().filter(item => item !== itemToRemove);
    this.planItems.set(items);
  }

  getTimeframeJson(): string {
    const details = { startDay: this.startDay, endDay: this.endDay, label: this.timePeriodLabel };
    return JSON.stringify({ recurrence: 'CUSTOM', details });
  }

  parseTimeframeJson(jsonStr: string): void {
    try {
      const config = JSON.parse(jsonStr);
      const details = config.details || {};
      this.startDay = details.startDay || details.days?.[0] || 1;
      this.endDay = details.endDay || details.days?.[1] || 30;
    } catch (e) {
      console.error('Failed to parse timeframe config', e);
    }
  }

  loadPlanForEditing(id: string): void {
    this.isLoading.set(true);
    this.http.get<{ success: boolean; data: any }>(`${this.apiService.apiUrl}/budget-plans`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          const plan = res.data.find((p: any) => p.id === id);
          if (plan) {
            this.planName = plan.name;
            this.parseTimeframeJson(plan.timeframe);
            this.planItems.set(plan.items || []);
          }
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSubmit(): void {
    if (!this.planName.trim()) {
      this.errorMessage.set('Please give your budget plan a name.');
      return;
    }

    if (this.planItems().length === 0) {
      this.errorMessage.set('Please add at least one transaction item to your plan.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const user = this.authService.currentUser();
    const userId = user ? user.id : '';

    const payload = {
      name: this.planName,
      timeframe: this.getTimeframeJson(),
      userId,
      items: this.planItems().map(i => ({
        type: i.type,
        categoryName: i.categoryName,
        amount: i.amount,
        accountId: i.accountId,
        toAccountId: i.toAccountId,
        transferFee: i.transferFee ?? null
      }))
    };

    if (this.isEditMode && this.editingId) {
      this.http.put(`${this.apiService.apiUrl}/budget-plans/${this.editingId}`, payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
          this.close.emit();
          this.resetForm();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || "Failed to update budget plan. Let's try that again.");
        }
      });
    } else {
      this.http.post(`${this.apiService.apiUrl}/budget-plans`, payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.saved.emit();
          this.close.emit();
          this.resetForm();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || "Failed to save budget plan. Let's try that again.");
        }
      });
    }
  }

  resetForm(): void {
    this.planName = '';
    this.startDay = 1;
    this.endDay = 30;
    this.planItems.set([]);
    this.cancelIncomeEdit();
    this.cancelTransferEdit();
    this.cancelSavingsEdit();
    this.cancelOutflowEdit();
    this.errorMessage.set(null);
  }

  get totalPlannedIncome(): number {
    return this.planItems()
      .filter(i => i.type === 'INCOME')
      .reduce((sum, i) => sum + i.amount, 0);
  }

  get totalPlannedTransfers(): number {
    return this.planItems()
      .filter(i => i.type === 'TRANSFER')
      .reduce((sum, i) => sum + i.amount, 0);
  }

  get totalPlannedSavings(): number {
    return this.planItems()
      .filter(i => i.type === 'SAVINGS')
      .reduce((sum, i) => sum + i.amount, 0);
  }

  get totalPlannedOutflows(): number {
    return this.planItems()
      .filter(i => i.type === 'EXPENSE')
      .reduce((sum, i) => sum + i.amount, 0);
  }

  get netBalance(): number {
    return this.totalPlannedIncome - this.totalPlannedOutflows;
  }

  onClose(): void {
    this.close.emit();
  }
}

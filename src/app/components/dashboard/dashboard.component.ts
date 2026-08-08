import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, Transaction, Account, BudgetPlan, BudgetGoal, BudgetGoalGroup } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ResetPasswordComponent } from '../auth/reset-password/reset-password.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ResetPasswordComponent, HeaderComponent, DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  protected readonly user = this.authService.currentUser;
  protected readonly dbStatus = signal<string>('Connecting...');
  protected readonly transactions = signal<Transaction[]>([]);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly budgetPlans = signal<BudgetPlan[]>([]);
  protected readonly budgetGoal = signal<BudgetGoal | null>(null);
  protected readonly monthlySavingsGoal = signal<number>(0);
  protected readonly isResetModalOpen = signal<boolean>(false);
  protected readonly isLoadingTransactions = signal<boolean>(true);

  protected readonly hideAmounts = this.authService.hideAmounts;

  // Net Worth Configuration
  protected readonly includeSavingsInNetWorth = signal<boolean>(
    localStorage.getItem('fintrack_networth_include_savings') !== 'false'
  );
  protected readonly includeCreditInNetWorth = signal<boolean>(
    localStorage.getItem('fintrack_networth_include_credit') === 'true'
  );

  toggleIncludeSavings(): void {
    const nextVal = !this.includeSavingsInNetWorth();
    this.includeSavingsInNetWorth.set(nextVal);
    localStorage.setItem('fintrack_networth_include_savings', String(nextVal));
  }

  toggleIncludeCredit(): void {
    const nextVal = !this.includeCreditInNetWorth();
    this.includeCreditInNetWorth.set(nextVal);
    localStorage.setItem('fintrack_networth_include_credit', String(nextVal));
  }


  // Computations for real totals
  protected readonly totalNetWorth = computed(() => {
    return this.accounts()
      .filter(acc => {
        if (acc.type === 'SAVINGS' && !this.includeSavingsInNetWorth()) return false;
        if (acc.type === 'CREDIT' && !this.includeCreditInNetWorth()) return false;
        return true;
      })
      .reduce((sum, acc) => {
        if (acc.type === 'CREDIT') {
          return sum - acc.balance;
        }
        return sum + acc.balance;
      }, 0);
  });

  protected readonly totalIncome = computed(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return this.transactions()
      .filter(t => {
        if (t.type !== 'INCOME') return false;
        const d = new Date(t.expenseDate || t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  });

  protected readonly totalExpenses = computed(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return this.transactions()
      .filter(t => {
        if (t.type !== 'EXPENSE') return false;
        const d = new Date(t.expenseDate || t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  });

  protected readonly totalSavings = computed(() => {
    return this.accounts()
      .filter(acc => acc.type === 'SAVINGS')
      .reduce((sum, acc) => sum + acc.balance, 0);
  });

  protected readonly currentMonthSavings = computed(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return this.transactions()
      .filter(t => {
        if (t.type !== 'SAVINGS') return false;
        const d = new Date(t.expenseDate || t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  });

  protected readonly savingsGoalProgressPercentage = computed(() => {
    const goal = this.monthlySavingsGoal();
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((this.currentMonthSavings() / goal) * 100));
  });

  protected readonly activeBudgetPlan = computed(() => {
    const plans = this.budgetPlans();
    return plans.find(p => p.isActive) || null;
  });

  protected readonly activePlanInflows = computed(() => {
    // Always use actual income received during the current month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    return this.transactions()
      .filter(t => {
        if (t.type !== 'INCOME') return false;
        const d = new Date(t.expenseDate || t.date).getTime();
        return d >= start && d <= end;
      })
      .reduce((sum, t) => sum + t.amount, 0) || 1; // avoid divide by zero
  });

  protected readonly activePlanOutflows = computed(() => {
    const plan = this.activeBudgetPlan();
    if (!plan) return 0;
    return (plan.items || []).filter(i => i.type === 'EXPENSE').reduce((sum, i) => sum + i.amount, 0);
  });

  protected readonly activePlanSavings = computed(() => {
    const plan = this.activeBudgetPlan();
    if (!plan) return 0;
    return (plan.items || []).filter(i => i.type === 'SAVINGS').reduce((sum, i) => sum + i.amount, 0);
  });

  protected readonly activePlanRemaining = computed(() => {
    return this.activePlanInflows() - this.activePlanOutflows();
  });

  protected readonly activePeriodTransactions = computed(() => {
    // Always use the whole current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const start = startOfMonth.getTime();
    const end = endOfMonth.getTime();

    return this.transactions().filter(t => {
      const d = new Date(t.expenseDate || t.date).getTime();
      return d >= start && d <= end;
    });
  });

  protected readonly activePeriodIncome = computed(() => {
    return this.activePeriodTransactions()
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  });

  protected readonly goalGroupAnalytics = computed(() => {
    const goal = this.budgetGoal();
    const plan = this.activeBudgetPlan();
    if (!goal) return [];

    const totalPlannedIncome = this.activePlanInflows() || 1;

    return goal.groups.map(g => {
      const name = g.name;
      const targetPercentage = g.percentage || 1; // avoid divide by zero

      let budgetedAmount = 0;
      if (plan) {
        budgetedAmount = (plan.items || []).filter(item => {
          if (g.categories.includes('Savings')) {
            return item.type === 'SAVINGS';
          }
          return g.categories.includes(item.categoryName);
        })
        .reduce((sum, i) => sum + i.amount, 0);
      }
      const budgetedPercentage = Math.round((budgetedAmount / totalPlannedIncome) * 100);

      const actualAmount = this.activePeriodTransactions().filter(t => {
        if (g.categories.includes('Savings')) {
          return t.type === 'SAVINGS';
        }
        return g.categories.includes(t.category);
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const actualPercentage = Math.round((actualAmount / totalPlannedIncome) * 100);

      // Achievement percentages (capped at 100% or allowed beyond)
      const budgetedAchievement = Math.min(100, Math.round((budgetedPercentage / targetPercentage) * 100));
      const actualAchievement = Math.round((actualPercentage / targetPercentage) * 100);

      const targetAmount = (targetPercentage / 100) * totalPlannedIncome;

      return {
        name,
        targetPercentage,
        targetAmount,
        budgetedAmount,
        budgetedPercentage,
        budgetedAchievement,
        actualAmount,
        actualPercentage,
        actualAchievement,
        categories: g.categories || []
      };
    });
  });

  protected readonly donutGradient = computed(() => {
    const analytics = this.goalGroupAnalytics();
    if (analytics.length === 0) return 'conic-gradient(var(--border-subtle) 0% 100%)';

    let currentOffset = 0;
    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
    const parts: string[] = [];

    analytics.forEach((g, idx) => {
      const percentage = Math.max(0, g.actualPercentage);
      if (percentage > 0) {
        const color = colors[idx % colors.length];
        parts.push(`${color} ${currentOffset}% ${currentOffset + percentage}%`);
        currentOffset += percentage;
      }
    });

    if (currentOffset < 100) {
      parts.push(`var(--border-subtle) ${currentOffset}% 100%`);
    }

    return `conic-gradient(${parts.join(', ')})`;
  });

  protected readonly totalAllocatedPercentage = computed(() => {
    const pct = this.goalGroupAnalytics().reduce((sum, g) => sum + g.actualPercentage, 0);
    return Math.min(100, pct);
  });

  protected readonly Math = Math;



  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.getHealth().subscribe({
      next: (res) => this.dbStatus.set(`${res.database}`),
      error: () => this.dbStatus.set('PostgreSQL Standby / In-Memory')
    });

    const userId = this.authService.currentUser()?.id;

    this.isLoadingTransactions.set(true);
    this.apiService.getTransactions(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.transactions.set(res.data);
        }
        this.isLoadingTransactions.set(false);
      },
      error: (err) => {
        console.warn('Failed to load transactions:', err);
        this.isLoadingTransactions.set(false);
      }
    });

    this.apiService.getAccounts(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.accounts.set(res.data);
        }
      },
      error: (err) => console.warn('Failed to load accounts:', err)
    });

    this.apiService.getBudgetPlans(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.budgetPlans.set(res.data);
        }
      }
    });

    if (userId) {
      this.apiService.getSavingsGoal(userId).subscribe({
        next: (res) => {
          if (res.success) {
            this.monthlySavingsGoal.set(res.monthlySavingsGoal);
          }
        }
      });

      this.apiService.getBudgetGoal(userId).subscribe({
        next: (res) => {
          if (res.success) {
            this.budgetGoal.set(res.data);
          }
        }
      });
    }

  }

  openResetModal(): void {
    this.isResetModalOpen.set(true);
  }

  closeResetModal(): void {
    this.isResetModalOpen.set(false);
  }

  handleLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

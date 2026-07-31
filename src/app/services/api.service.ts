import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HealthResponse {
  status: string;
  database: string;
  timestamp: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  expenseType?: 'FIXED' | 'VARIABLE';
  category: string;
  date: string;
  expenseDate?: string;
  accountId?: string;
  toAccountId?: string;
  transferFee?: number;
  userId?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  createdDate?: string;
  updatedDate?: string;
  userId?: string;
}

export interface BudgetPlanItem {
  id?: string;
  type: 'INCOME' | 'EXPENSE' | 'SAVINGS' | 'TRANSFER';
  categoryName: string;
  amount: number;
  accountId?: string;
  toAccountId?: string;
  transferFee?: number;
}

export interface BudgetPlan {
  id: string;
  name: string;
  timeframe: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  implementedAccountId?: string;
  userId: string;
  createdDate: string;
  items: BudgetPlanItem[];
}

export interface RefIncomeCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdDate?: string;
  updatedDate?: string;
}

export interface RefExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdDate?: string;
  updatedDate?: string;
}

export interface RefSavingCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdDate?: string;
  updatedDate?: string;
}

export interface RefAccountType {
  id: string;
  code: string;
  label: string;
  icon: string;
  sortOrder: number;
}

export interface BudgetGoalGroup {
  id?: string;
  name: string;
  percentage: number;
  categories: string[];
  budgetGoalId?: string;
}

export interface BudgetGoal {
  id: string;
  userId: string;
  groups: BudgetGoalGroup[];
  createdDate: string;
  updatedDate: string;
}

export interface Review {
  id?: string;
  rating: number;
  comment: string;
  userId: string;
  createdDate?: string;
  user?: {
    name: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api'
    : 'https://fintrack-backend.onrender.com/api'; // Replace with your production Render URL

  getHealth(): Observable<HealthResponse> {

    return this.http.get<HealthResponse>(`${this.baseUrl}/health`);
  }

  getTransactions(userId?: string): Observable<{ success: boolean; data: Transaction[] }> {
    const params = userId ? new HttpParams().set('userId', userId) : undefined;
    return this.http.get<{ success: boolean; data: Transaction[] }>(`${this.baseUrl}/transactions`, { params });
  }

  getAccounts(userId?: string): Observable<{ success: boolean; data: Account[] }> {
    const params = userId ? new HttpParams().set('userId', userId) : undefined;
    return this.http.get<{ success: boolean; data: Account[] }>(`${this.baseUrl}/accounts`, { params });
  }

  getBudgetPlans(userId?: string): Observable<{ success: boolean; data: BudgetPlan[] }> {
    const params = userId ? new HttpParams().set('userId', userId) : undefined;
    return this.http.get<{ success: boolean; data: BudgetPlan[] }>(`${this.baseUrl}/budget-plans`, { params });
  }

  implementBudgetPlan(planId: string, payload: { startDate: string; endDate: string; accountId: string; expenseAccountId?: string; savingsAccountId?: string; userId: string }): Observable<{ success: boolean; message: string; data: BudgetPlan }> {
    return this.http.post<{ success: boolean; message: string; data: BudgetPlan }>(`${this.baseUrl}/budget-plans/${planId}/implement`, payload);
  }

  deactivateBudgetPlan(planId: string): Observable<{ success: boolean; message: string; data: BudgetPlan }> {
    return this.http.put<{ success: boolean; message: string; data: BudgetPlan }>(`${this.baseUrl}/budget-plans/${planId}/deactivate`, {});
  }

  getBudgetGoal(userId: string): Observable<{ success: boolean; data: BudgetGoal }> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<{ success: boolean; data: BudgetGoal }>(`${this.baseUrl}/budget-goals`, { params });
  }

  updateBudgetGoal(userId: string, groups: BudgetGoalGroup[]): Observable<{ success: boolean; data: BudgetGoal }> {
    return this.http.put<{ success: boolean; data: BudgetGoal }>(`${this.baseUrl}/budget-goals`, { userId, groups });
  }


  getSavingsGoal(userId: string): Observable<{ success: boolean; monthlySavingsGoal: number }> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<{ success: boolean; monthlySavingsGoal: number }>(`${this.baseUrl}/user/savings-goal`, { params });
  }

  updateSavingsGoal(userId: string, monthlySavingsGoal: number): Observable<{ success: boolean; monthlySavingsGoal: number }> {
    return this.http.put<{ success: boolean; monthlySavingsGoal: number }>(`${this.baseUrl}/user/savings-goal`, { userId, monthlySavingsGoal });
  }

  // Reference endpoints
  getIncomeCategories(): Observable<{ success: boolean; data: RefIncomeCategory[] }> {
    return this.http.get<{ success: boolean; data: RefIncomeCategory[] }>(`${this.baseUrl}/refs/income-categories`);
  }

  getExpenseCategories(): Observable<{ success: boolean; data: RefExpenseCategory[] }> {
    return this.http.get<{ success: boolean; data: RefExpenseCategory[] }>(`${this.baseUrl}/refs/expense-categories`);
  }

  getSavingCategories(): Observable<{ success: boolean; data: RefSavingCategory[] }> {
    return this.http.get<{ success: boolean; data: RefSavingCategory[] }>(`${this.baseUrl}/refs/saving-categories`);
  }

  getAccountTypes(): Observable<{ success: boolean; data: RefAccountType[] }> {
    return this.http.get<{ success: boolean; data: RefAccountType[] }>(`${this.baseUrl}/refs/account-types`);
  }

  submitReview(rating: number, comment: string, userId: string): Observable<{ success: boolean; message: string; data: Review }> {
    return this.http.post<{ success: boolean; message: string; data: Review }>(`${this.baseUrl}/reviews`, { rating, comment, userId });
  }

  getReviews(userId?: string): Observable<{ success: boolean; data: Review[] }> {
    const params = userId ? new HttpParams().set('userId', userId) : undefined;
    return this.http.get<{ success: boolean; data: Review[] }>(`${this.baseUrl}/reviews`, { params });
  }
}

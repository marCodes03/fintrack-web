import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { IncomeComponent } from './components/income/income.component';
import { ExpensesComponent } from './components/expenses/expenses.component';
import { TransactionsComponent } from './components/transactions/transactions.component';
import { BudgetsComponent } from './components/budgets/budgets.component';
import { AccountsComponent } from './components/accounts/accounts.component';
import { ReferencesComponent } from './components/references/references.component';
import { SavingsComponent } from './components/savings/savings.component';
import { ReviewsComponent } from './components/reviews/reviews.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'income', component: IncomeComponent },
  { path: 'expenses', component: ExpensesComponent },
  { path: 'savings', component: SavingsComponent },
  { path: 'transactions', component: TransactionsComponent },
  { path: 'budgets', component: BudgetsComponent },
  { path: 'accounts', component: AccountsComponent },
  { path: 'references', component: ReferencesComponent },
  { path: 'reviews', component: ReviewsComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];

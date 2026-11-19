import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'login', title: 'Sign in · FinTrack', loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', title: 'Create account · FinTrack', loadComponent: () => import('./components/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'forgot-password', title: 'Reset password · FinTrack', loadComponent: () => import('./components/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'verify-email', title: 'Verify email · FinTrack', loadComponent: () => import('./components/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent) },
  { path: 'dashboard', title: 'Dashboard · FinTrack', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'income', title: 'Income · FinTrack', loadComponent: () => import('./components/income/income.component').then(m => m.IncomeComponent) },
  { path: 'expenses', title: 'Expenses · FinTrack', loadComponent: () => import('./components/expenses/expenses.component').then(m => m.ExpensesComponent) },
  { path: 'savings', title: 'Savings · FinTrack', loadComponent: () => import('./components/savings/savings.component').then(m => m.SavingsComponent) },
  { path: 'transactions', title: 'Transactions · FinTrack', loadComponent: () => import('./components/transactions/transactions.component').then(m => m.TransactionsComponent) },
  { path: 'budgets', title: 'Budget plan · FinTrack', loadComponent: () => import('./components/budgets/budgets.component').then(m => m.BudgetsComponent) },
  { path: 'accounts', title: 'Accounts · FinTrack', loadComponent: () => import('./components/accounts/accounts.component').then(m => m.AccountsComponent) },
  { path: 'references', title: 'References · FinTrack', loadComponent: () => import('./components/references/references.component').then(m => m.ReferencesComponent) },
  { path: 'reviews', title: 'Reviews · FinTrack', loadComponent: () => import('./components/reviews/reviews.component').then(m => m.ReviewsComponent) },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];

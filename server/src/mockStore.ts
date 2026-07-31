import { Response } from 'express';

// In-memory users database for non-DB / fallback usage without pre-seeded accounts or transactions
export const mockUsers: any[] = [
  {
    id: 'user-default-1',
    email: 'user@example.com',
    name: 'Default User',
    password: 'password123'
  }
];

export const mockAccounts: any[] = [];
export const mockTransactions: any[] = [];
export const mockBudgetPlans: any[] = [];
export const mockBudgetGoals: any[] = [];

// Reference table in-memory stores (EMPTY by default - NO seed data)
export const mockIncomeCategories: any[] = [];
export const mockExpenseCategories: any[] = [
  { id: 'ec-1', name: 'Food & Dining', description: 'Groceries, restaurants, fast food, and snacks', isActive: true },
  { id: 'ec-2', name: 'Housing & Rent', description: 'Rent, mortgage, home maintenance, or repairs', isActive: true },
  { id: 'ec-3', name: 'Utilities', description: 'Electricity, water, gas, internet, phone bill', isActive: true },
  { id: 'ec-4', name: 'Transportation', description: 'Fuel, vehicle maintenance, taxi, train/bus fare', isActive: true },
  { id: 'ec-5', name: 'Health & Medical', description: 'Doctor visits, medicine, insurance premiums, dental', isActive: true },
  { id: 'ec-6', name: 'Entertainment & Leisure', description: 'Movies, streaming services, concerts, hobbies', isActive: true },
  { id: 'ec-7', name: 'Shopping', description: 'Clothes, electronics, personal care items, gifts', isActive: true },
  { id: 'ec-8', name: 'Education', description: 'Tuition fees, books, courses, school supplies', isActive: true },
  { id: 'ec-9', name: 'Insurance', description: 'Life, health, car, or home insurance', isActive: true },
  { id: 'ec-10', name: 'Transfer Fee', description: 'Fees associated with internal transfers or savings deposits', isActive: true },
  { id: 'ec-11', name: 'Miscellaneous', description: 'Any other miscellaneous expenses', isActive: true }
];
export const mockSavingCategories: any[] = [];
export const mockRecurrenceIntervals: any[] = [
  { id: 'ri-1', code: 'NONE', label: 'None (One-time)', sortOrder: 0 },
  { id: 'ri-2', code: 'DAILY', label: 'Daily', sortOrder: 1 },
  { id: 'ri-3', code: 'WEEKLY', label: 'Weekly', sortOrder: 2 },
  { id: 'ri-4', code: 'BI_MONTHLY', label: 'Bi-Monthly (Twice a Month)', sortOrder: 3 },
  { id: 'ri-5', code: 'MONTHLY', label: 'Monthly', sortOrder: 4 },
  { id: 'ri-6', code: 'YEARLY', label: 'Yearly', sortOrder: 5 }
];
export const mockAccountTypes: any[] = [
  { id: 'at-1', code: 'CASH', label: 'Cash', icon: '💵', sortOrder: 0 },
  { id: 'at-2', code: 'BANK', label: 'Bank Account', icon: '🏦', sortOrder: 1 },
  { id: 'at-3', code: 'CREDIT', label: 'Credit Card', icon: '💳', sortOrder: 2 },
  { id: 'at-4', code: 'SAVINGS', label: 'Savings Account', icon: '🏧', sortOrder: 3 },
  { id: 'at-5', code: 'E_WALLET', label: 'E-Wallet', icon: '📱', sortOrder: 4 }
];

// Active OTP store (in-memory)
export const activeOtps = new Map<string, string>();

// Helper to return database errors directly to client without masking
export function handleDbError(err: any, res: Response, defaultMsg = 'Database operation failed') {
  console.error('Database Error:', err);
  const errorMessage = err?.message || String(err);
  return res.status(500).json({
    success: false,
    message: `${defaultMsg}: ${errorMessage}`,
    errorDetails: errorMessage
  });
}

import { prisma } from '../prisma';
import {
  getBudgetPlansFromDb,
  createBudgetPlanInDb,
  updateBudgetPlanInDb,
  BudgetPlanInput
} from '../execution/budget.execution';
import { mockBudgetPlans } from '../mockStore';

/**
 * Layer 2: Orchestration Layer (Service).
 * Orchestrates calls to the deterministic Execution Layer 3.
 * Implements self-annealing fallback behaviors if database operations fail.
 */
export class BudgetOrchestrator {
  /**
   * Retrieves budget plans from the database. Falls back to mockStore if database fails.
   */
  static async getBudgetPlans(userId?: string) {
    try {
      const plans = await getBudgetPlansFromDb(userId);
      return { success: true, data: plans };
    } catch (err) {
      console.warn('DB error on getBudgetPlans, self-annealing with mock fallback:', err);
      const plans = userId ? mockBudgetPlans.filter((p) => p.userId === userId) : mockBudgetPlans;
      return { success: true, data: plans };
    }
  }

  /**
   * Creates a budget plan. If the database fails, self-anneals by creating it in the mock store.
   */
  static async createBudgetPlan(data: BudgetPlanInput) {
    let targetUserId = data.userId;
    try {
      if (!targetUserId) {
        const defaultUser = await prisma.user.findFirst();
        if (defaultUser) targetUserId = defaultUser.id;
      }

      if (targetUserId) {
        const plan = await createBudgetPlanInDb(data, targetUserId);
        return { success: true, data: plan };
      }
    } catch (err) {
      console.warn('DB error on createBudgetPlan, self-annealing with mock fallback:', err);
    }

    // Fallback Mock store logic
    const plan = {
      id: `bp-${Date.now()}`,
      name: data.name,
      timeframe: data.timeframe,
      userId: targetUserId || 'user-default-1',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      items: (data.items || []).map((i) => ({
        id: `bpi-${Date.now()}-${Math.random()}`,
        type: i.type,
        categoryName: i.categoryName,
        amount: parseFloat(String(i.amount)) || 0,
        accountId: i.accountId || null,
        toAccountId: i.toAccountId || null,
        transferFee: i.transferFee ? parseFloat(String(i.transferFee)) : null
      }))
    };
    mockBudgetPlans.push(plan);
    return { success: true, data: plan };
  }

  /**
   * Updates a budget plan. Self-anneals by updating in-memory mock store if database fails.
   */
  static async updateBudgetPlan(id: string, data: Partial<BudgetPlanInput>) {
    try {
      const updated = await updateBudgetPlanInDb(id, data);
      return { success: true, data: updated };
    } catch (err) {
      console.warn('DB error on updateBudgetPlan, self-annealing with mock fallback:', err);
      const index = mockBudgetPlans.findIndex((p) => p.id === id);
      if (index !== -1) {
        const existing = mockBudgetPlans[index];
        const updated = {
          ...existing,
          ...data,
          updatedDate: new Date().toISOString(),
          items: data.items
            ? data.items.map((i) => ({
                id: `bpi-${Date.now()}-${Math.random()}`,
                type: i.type,
                categoryName: i.categoryName,
                amount: parseFloat(String(i.amount)) || 0,
                accountId: i.accountId || null,
                toAccountId: i.toAccountId || null,
                transferFee: i.transferFee ? parseFloat(String(i.transferFee)) : null
              }))
            : existing.items
        };
        mockBudgetPlans[index] = updated;
        return { success: true, data: updated };
      }
      return { success: false, message: 'Budget plan not found in fallback storage.' };
    }
  }
}

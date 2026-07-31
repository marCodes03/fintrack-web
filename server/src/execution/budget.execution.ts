import { prisma } from '../prisma';

export interface BudgetPlanItemInput {
  type: string;
  categoryName: string;
  amount: number | string;
  accountId?: string | null;
  toAccountId?: string | null;
  transferFee?: number | string | null;
}

export interface BudgetPlanInput {
  name: string;
  timeframe: string;
  userId?: string;
  items?: BudgetPlanItemInput[];
}

/**
 * Layer 3: Execution layer.
 * Contains only deterministic data fetching, insertion, updates, and validations.
 */

export async function getBudgetPlansFromDb(userId?: string) {
  return await prisma.budgetPlan.findMany({
    where: userId ? { userId } : {},
    include: { items: true },
    orderBy: { createdDate: 'desc' }
  });
}

export async function createBudgetPlanInDb(data: BudgetPlanInput, fallbackUserId: string) {
  const targetUserId = data.userId || fallbackUserId;
  const items = data.items || [];

  return await prisma.budgetPlan.create({
    data: {
      name: data.name,
      timeframe: data.timeframe,
      userId: targetUserId,
      items: {
        create: items.map((i) => ({
          type: i.type,
          categoryName: i.categoryName,
          amount: parseFloat(String(i.amount)) || 0,
          accountId: i.accountId || null,
          toAccountId: i.toAccountId || null,
          transferFee: i.transferFee ? parseFloat(String(i.transferFee)) : null
        }))
      }
    },
    include: { items: true }
  });
}

export async function updateBudgetPlanInDb(id: string, data: Partial<BudgetPlanInput>) {
  return await prisma.$transaction(async (tx) => {
    if (data.items) {
      await tx.budgetPlanItem.deleteMany({ where: { budgetPlanId: id } });
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.timeframe !== undefined) updateData.timeframe = data.timeframe;
    if (data.items) {
      updateData.items = {
        create: data.items.map((i) => ({
          type: i.type,
          categoryName: i.categoryName,
          amount: parseFloat(String(i.amount)) || 0,
          accountId: i.accountId || null,
          toAccountId: i.toAccountId || null,
          transferFee: i.transferFee ? parseFloat(String(i.transferFee)) : null
        }))
      };
    }

    return await tx.budgetPlan.update({
      where: { id },
      data: updateData,
      include: { items: true }
    });
  });
}

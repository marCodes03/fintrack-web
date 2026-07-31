import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import {
  mockBudgetPlans,
  mockBudgetGoals,
  mockUsers,
  mockTransactions,
  mockAccounts,
  handleDbError
} from '../mockStore';
import { BudgetOrchestrator } from '../services/budget.orchestrator';

const router = Router();

// GET /api/budget-plans
router.get('/budget-plans', async (req: Request, res: Response) => {
  const userId = req.query['userId'] as string;
  const result = await BudgetOrchestrator.getBudgetPlans(userId);
  res.json(result);
});

// POST /api/budget-plans
router.post('/budget-plans', async (req: Request, res: Response) => {
  const { name, timeframe, userId, items } = req.body;
  if (!name || !timeframe) {
    res.status(400).json({ success: false, message: 'Name and timeframe are required.' });
    return;
  }
  const result = await BudgetOrchestrator.createBudgetPlan({ name, timeframe, userId, items });
  res.status(201).json(result);
});

// PUT /api/budget-plans/:id
router.put('/budget-plans/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { name, timeframe, items } = req.body;
  const result = await BudgetOrchestrator.updateBudgetPlan(id, { name, timeframe, items });
  if (!result.success) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

// DELETE /api/budget-plans/:id
router.delete('/budget-plans/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  try {
    await prisma.budgetPlan.delete({ where: { id } });
    res.json({ success: true, message: 'Budget plan deleted.' });
  } catch (_err) {
    const idx = mockBudgetPlans.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Budget plan not found.' });
      return;
    }
    mockBudgetPlans.splice(idx, 1);
    res.json({ success: true, message: 'Budget plan deleted.' });
  }
});

// Budget Plan Deactivation
router.put('/budget-plans/:id/deactivate', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  try {
    const plan = await prisma.budgetPlan.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ success: true, data: plan });
  } catch (_err) {
    const p = mockBudgetPlans.find(p => p.id === id);
    if (!p) {
      res.status(404).json({ success: false, message: 'Budget plan not found' });
      return;
    }
    p.isActive = false;
    res.json({ success: true, data: p });
  }
});

// Budget Goals (Ideal Setup)
router.get('/budget-goals', async (req: Request, res: Response) => {
  const userId = req.query['userId'] as string;
  if (!userId) {
    res.status(400).json({ success: false, message: 'Please log in to view your budget goals.' });
    return;
  }
  try {
    const goal = await prisma.budgetGoal.findUnique({
      where: { userId },
      include: { groups: true }
    });
    res.json({ success: true, data: goal });
  } catch (_err) {
    const goal = mockBudgetGoals.find(g => g.userId === userId);
    res.json({ success: true, data: goal || null });
  }
});

router.put('/budget-goals', async (req: Request, res: Response) => {
  const userId = (req.query['userId'] as string) || req.body.userId;
  const { groups } = req.body;
  if (!userId || !groups) {
    res.status(400).json({ success: false, message: 'Please log in and define your budget groups before saving.' });
    return;
  }

  try {
    let goal = await prisma.budgetGoal.findUnique({ where: { userId } });
    if (!goal) {
      goal = await prisma.budgetGoal.create({ data: { userId } });
    }

    await prisma.budgetGoalGroup.deleteMany({ where: { budgetGoalId: goal.id } });

    for (const g of groups) {
      await prisma.budgetGoalGroup.create({
        data: {
          budgetGoalId: goal.id,
          name: g.name,
          percentage: parseFloat(g.percentage),
          categories: g.categories
        }
      });
    }

    const updatedGoal = await prisma.budgetGoal.findUnique({
      where: { id: goal.id },
      include: { groups: true }
    });
    res.json({ success: true, data: updatedGoal });
  } catch (_err) {
    let goal = mockBudgetGoals.find(g => g.userId === userId);
    if (!goal) {
      goal = { id: `bg-mock-${Date.now()}`, userId, groups: [] };
      mockBudgetGoals.push(goal);
    }
    goal.groups = groups.map((g: any, i: number) => ({
      id: `bgg-mock-${Date.now()}-${i}`,
      name: g.name,
      percentage: parseFloat(g.percentage),
      categories: g.categories,
      budgetGoalId: goal.id
    }));
    res.json({ success: true, data: goal });
  }
});

// Implement/Activate Budget Plan for a Period (Transaction Generation Engine)
router.post('/budget-plans/:id/implement', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { startDate, endDate, accountId, expenseAccountId, savingsAccountId, userId, execute } = req.body;

  if (!startDate || !endDate || !accountId) {
    res.status(400).json({ success: false, message: 'Start date, end date, and account are required to implement a budget plan.' });
    return;
  }

  const expAccId = expenseAccountId || accountId;
  const savAccId = savingsAccountId || accountId;

  try {
    const plan = await prisma.budgetPlan.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!plan) {
      res.status(404).json({ success: false, message: 'Budget plan not found.' });
      return;
    }

    const targetUserId = userId || plan.userId;

    let timePeriod = plan.name || `${startDate} - ${endDate}`;
    if (plan.timeframe) {
      try {
        const parsed = JSON.parse(plan.timeframe);
        if (parsed.details?.label) {
          timePeriod = parsed.details.label;
        } else if (parsed.details?.startDay && parsed.details?.endDay) {
          timePeriod = `Day ${parsed.details.startDay} - Day ${parsed.details.endDay}`;
        } else if (parsed.recurrence === 'BI_MONTHLY') timePeriod = 'Bi-Monthly';
        else if (parsed.recurrence === 'MONTHLY') timePeriod = 'Monthly (Day 1 - 30)';
        else if (parsed.recurrence === 'WEEKLY') timePeriod = 'Weekly';
        else if (parsed.recurrence === 'YEARLY') timePeriod = 'Yearly';
      } catch (_e) {}
    }

    const result = await prisma.$transaction(async (tx) => {
      // Deactivate other active budget plans for user
      await tx.budgetPlan.updateMany({
        where: { userId: targetUserId, NOT: { id } },
        data: { isActive: false }
      });

      // Update current plan as active
      const updatedPlan = await tx.budgetPlan.update({
        where: { id },
        data: {
          isActive: true,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          implementedAccountId: accountId
        },
        include: { items: true }
      });

      if (execute !== false) {
        // Process each item in the budget plan using its individual assigned accountId and toAccountId
        for (const item of plan.items) {
          const titleFormatted = `BP(${timePeriod}): ${item.categoryName}`;
          const targetAccId = item.accountId || accountId;
          const destAccId = item.toAccountId || accountId;

          if (item.type === 'INCOME') {
            await tx.transaction.create({
              data: {
                description: titleFormatted,
                amount: item.amount,
                type: 'INCOME',
                expenseType: 'FIXED',
                category: item.categoryName,
                accountId: targetAccId,
                date: new Date(startDate),
                userId: targetUserId
              }
            });
            await tx.account.update({
              where: { id: targetAccId },
              data: { balance: { increment: item.amount } }
            });
          } else if (item.type === 'TRANSFER') {
            const fee = (item as any).transferFee || 0;
            await tx.transaction.create({
              data: {
                description: titleFormatted,
                amount: item.amount,
                type: 'TRANSFER',
                category: 'Transfer',
                accountId: targetAccId,
                toAccountId: destAccId,
                date: new Date(startDate),
                userId: targetUserId
              }
            });
            await tx.account.update({
              where: { id: targetAccId },
              data: { balance: { decrement: item.amount } }
            });
            await tx.account.update({
              where: { id: destAccId },
              data: { balance: { increment: item.amount } }
            });
            // If transfer fee > 0, record it as a separate EXPENSE transaction
            if (fee > 0) {
              await tx.transaction.create({
                data: {
                  description: `BP(${timePeriod}): Transfer Fee — ${item.categoryName}`,
                  amount: fee,
                  type: 'EXPENSE',
                  expenseType: 'FIXED',
                  category: 'Transfer Fee',
                  accountId: targetAccId,
                  date: new Date(startDate),
                  userId: targetUserId
                }
              });
              await tx.account.update({
                where: { id: targetAccId },
                data: { balance: { decrement: fee } }
              });
            }
          } else if (item.type === 'SAVINGS') {
            const fee = (item as any).transferFee || 0;
            await tx.transaction.create({
              data: {
                description: titleFormatted,
                amount: item.amount,
                type: 'SAVINGS',
                category: item.categoryName,
                accountId: targetAccId,
                toAccountId: destAccId,
                date: new Date(startDate),
                userId: targetUserId
              }
            });
            await tx.account.update({
              where: { id: targetAccId },
              data: { balance: { decrement: item.amount } }
            });
            await tx.account.update({
              where: { id: destAccId },
              data: { balance: { increment: item.amount } }
            });
            // If transfer fee > 0, record it as a separate EXPENSE transaction
            if (fee > 0) {
              await tx.transaction.create({
                data: {
                  description: `BP(${timePeriod}): Transfer Fee — ${item.categoryName}`,
                  amount: fee,
                  type: 'EXPENSE',
                  expenseType: 'FIXED',
                  category: 'Transfer Fee',
                  accountId: targetAccId,
                  date: new Date(startDate),
                  userId: targetUserId
                }
              });
              await tx.account.update({
                where: { id: targetAccId },
                data: { balance: { decrement: fee } }
              });
            }
          } else if (item.type === 'EXPENSE') {
            await tx.transaction.create({
              data: {
                description: titleFormatted,
                amount: item.amount,
                type: 'EXPENSE',
                expenseType: 'FIXED',
                category: item.categoryName,
                accountId: targetAccId,
                date: new Date(startDate),
                userId: targetUserId
              }
            });
            await tx.account.update({
              where: { id: targetAccId },
              data: { balance: { decrement: item.amount } }
            });
          }
        }
      }

      return updatedPlan;
    });

    res.json({ success: true, message: 'Budget plan activated and actual transactions recorded!', data: result });
  } catch (err: any) {
    const plan = mockBudgetPlans.find(p => p.id === id);
    if (plan) {
      let timePeriod = plan.name || `${startDate} - ${endDate}`;
      if (plan.timeframe) {
        try {
          const parsed = JSON.parse(plan.timeframe);
          if (parsed.details?.label) {
            timePeriod = parsed.details.label;
          } else if (parsed.details?.startDay && parsed.details?.endDay) {
            timePeriod = `Day ${parsed.details.startDay} - Day ${parsed.details.endDay}`;
          } else if (parsed.recurrence === 'BI_MONTHLY') timePeriod = 'Bi-Monthly';
          else if (parsed.recurrence === 'MONTHLY') timePeriod = 'Monthly (Day 1 - 30)';
          else if (parsed.recurrence === 'WEEKLY') timePeriod = 'Weekly';
          else if (parsed.recurrence === 'YEARLY') timePeriod = 'Yearly';
        } catch (_e) {}
      }

      mockBudgetPlans.forEach(p => { if (p.userId === plan.userId) p.isActive = false; });
      plan.isActive = true;
      plan.startDate = startDate;
      plan.endDate = endDate;
      plan.implementedAccountId = accountId;

      for (const item of (plan.items || [])) {
        const titleFormatted = `BP(${timePeriod}): ${item.categoryName}`;
        const targetAccId = item.accountId || accountId;
        const destAccId = item.toAccountId || accountId;

        if (item.type === 'INCOME') {
          const newTx = {
            id: `tx-mock-${Date.now()}-${Math.random()}`,
            description: titleFormatted,
            amount: item.amount,
            type: 'INCOME',
            expenseType: 'FIXED',
            category: item.categoryName,
            accountId: targetAccId,
            date: new Date(startDate).toISOString(),
            userId: plan.userId
          };
          mockTransactions.unshift(newTx);
          const acc = mockAccounts.find(a => a.id === targetAccId);
          if (acc) acc.balance += item.amount;
        } else if (item.type === 'TRANSFER' || item.type === 'SAVINGS') {
          const fee = item.transferFee || 0;
          const newTx = {
            id: `tx-mock-${Date.now()}-${Math.random()}`,
            description: titleFormatted,
            amount: item.amount,
            type: item.type,
            category: item.categoryName,
            accountId: targetAccId,
            toAccountId: destAccId,
            date: new Date(startDate).toISOString(),
            userId: plan.userId
          };
          mockTransactions.unshift(newTx);
          const srcAcc = mockAccounts.find((a: any) => a.id === targetAccId);
          const destAcc = mockAccounts.find((a: any) => a.id === destAccId);
          if (srcAcc) srcAcc.balance -= item.amount;
          if (destAcc) destAcc.balance += item.amount;
          // If transfer fee > 0, record it as a separate EXPENSE transaction
          if (fee > 0) {
            const feeTx = {
              id: `tx-mock-${Date.now()}-${Math.random()}`,
              description: `BP(${timePeriod}): Transfer Fee — ${item.categoryName}`,
              amount: fee,
              type: 'EXPENSE',
              expenseType: 'FIXED',
              category: 'Transfer Fee',
              accountId: targetAccId,
              date: new Date(startDate).toISOString(),
              userId: plan.userId
            };
            mockTransactions.unshift(feeTx);
            if (srcAcc) srcAcc.balance -= fee;
          }
        } else if (item.type === 'EXPENSE') {
          const newTx = {
            id: `tx-mock-${Date.now()}-${Math.random()}`,
            description: titleFormatted,
            amount: item.amount,
            type: 'EXPENSE',
            expenseType: 'FIXED',
            category: item.categoryName,
            accountId: targetAccId,
            date: new Date(startDate).toISOString(),
            userId: plan.userId
          };
          mockTransactions.unshift(newTx);
          const acc = mockAccounts.find(a => a.id === targetAccId);
          if (acc) acc.balance -= item.amount;
        }
      }

      res.json({ success: true, message: 'Budget plan activated and actual transactions recorded!', data: plan });
      return;
    }
    handleDbError(err, res, 'Failed to implement budget plan');
  }
});

// Savings Goal Endpoints
router.get('/user/savings-goal', async (req: Request, res: Response) => {
  const userId = req.query['userId'] as string;
  if (!userId) {
    res.status(400).json({ success: false, message: 'userId is required.' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({ success: true, monthlySavingsGoal: user?.monthlySavingsGoal || 0 });
  } catch (_err) {
    const user = mockUsers.find(u => u.id === userId);
    res.json({ success: true, monthlySavingsGoal: user?.monthlySavingsGoal || 0 });
  }
});

router.put('/user/savings-goal', async (req: Request, res: Response) => {
  const { userId, monthlySavingsGoal } = req.body;
  if (!userId) {
    res.status(400).json({ success: false, message: 'userId is required.' });
    return;
  }
  const numericGoal = parseFloat(monthlySavingsGoal) || 0;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { monthlySavingsGoal: numericGoal }
    });
    res.json({ success: true, monthlySavingsGoal: user.monthlySavingsGoal });
  } catch (_err) {
    const user = mockUsers.find(u => u.id === userId);
    if (user) user.monthlySavingsGoal = numericGoal;
    res.json({ success: true, monthlySavingsGoal: numericGoal });
  }
});

export default router;

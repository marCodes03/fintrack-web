import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { mockAccounts, handleDbError, mockTransactions } from '../mockStore';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// GET /api/accounts
router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId as string;
  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { updatedDate: 'desc' }
    });
    res.json({ success: true, data: accounts });
  } catch (_err) {
    const filtered = mockAccounts.filter(a => a.userId === userId);
    res.json({ success: true, data: filtered });
  }
});

// POST /api/accounts
router.post('/', async (req: Request, res: Response) => {
  const { name, type, balance, currency } = req.body;
  const userId = req.userId as string;
  if (!name || !type) {
    res.status(400).json({ success: false, message: 'Name and type are required.' });
    return;
  }

  if (userId.startsWith('user-mock-')) {
    const newAcc = {
      id: `acc-mock-${Date.now()}`,
      name,
      type,
      balance: parseFloat(balance) || 0,
      currency: currency || 'PHP',
      userId,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };
    mockAccounts.push(newAcc);
    res.status(201).json({ success: true, data: newAcc });
    return;
  }

  try {
    const newAcc = await prisma.account.create({
      data: {
        name,
        type,
        balance: parseFloat(balance) || 0,
        currency: currency || 'PHP',
        userId
      }
    });
    res.status(201).json({ success: true, data: newAcc });
    return;
  } catch (err) {
    return handleDbError(err, res, 'Failed to create account');
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { name, type, balance } = req.body;

  if (id.startsWith('acc-mock-')) {
    const idx = mockAccounts.findIndex(a => a.id === id && a.userId === req.userId);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }
    const currentAccount = mockAccounts[idx];
    const oldBalance = currentAccount.balance;
    const newBalance = balance !== undefined ? parseFloat(balance) : oldBalance;

    mockAccounts[idx] = {
      ...currentAccount,
      name,
      type,
      balance: newBalance,
      updatedDate: new Date().toISOString()
    };

    if (balance !== undefined && newBalance !== oldBalance) {
      const diff = newBalance - oldBalance;
      const txType = diff > 0 ? 'INCOME' : 'EXPENSE';
      const absAmount = Math.abs(diff);

      const newTx = {
        id: `tx-mock-${Date.now()}`,
        description: `Balance adjustment for ${name || currentAccount.name}`,
        amount: absAmount,
        type: txType,
        category: 'Adjustment',
        date: new Date().toISOString(),
        accountId: id,
        toAccountId: null,
        transferFee: 0,
        userId: currentAccount.userId,
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString()
      };
      mockTransactions.push(newTx);
    }

    res.json({ success: true, data: mockAccounts[idx] });
    return;
  }

  try {
    const currentAccount = await prisma.account.findUnique({
      where: { id }
    });

    if (!currentAccount || currentAccount.userId !== req.userId) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }

    const oldBalance = currentAccount.balance;
    const newBalance = balance !== undefined ? parseFloat(balance) : oldBalance;

    const updated = await prisma.account.update({
      where: { id },
      data: {
        name,
        type,
        balance: newBalance
      }
    });

    if (balance !== undefined && newBalance !== oldBalance) {
      const diff = newBalance - oldBalance;
      const txType = diff > 0 ? 'INCOME' : 'EXPENSE';
      const absAmount = Math.abs(diff);

      await prisma.transaction.create({
        data: {
          description: `Balance adjustment for ${name || currentAccount.name}`,
          amount: absAmount,
          type: txType,
          category: 'Adjustment',
          date: new Date(),
          userId: currentAccount.userId,
          accountId: id
        }
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    return handleDbError(err, res, 'Failed to update account');
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  if (id.startsWith('acc-mock-')) {
    const idx = mockAccounts.findIndex(a => a.id === id && a.userId === req.userId);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }
    if (mockAccounts[idx].balance !== 0) {
      res.status(400).json({ success: false, message: 'Cannot delete account with a non-zero balance.' });
      return;
    }
    mockAccounts.splice(idx, 1);
    res.json({ success: true, message: 'Account deleted.' });
    return;
  }

  try {
    const acc = await prisma.account.findUnique({ where: { id } });
    if (!acc || acc.userId !== req.userId) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }
    if (acc.balance !== 0) {
      res.status(400).json({ success: false, message: 'Cannot delete account with a non-zero balance.' });
      return;
    }

    await prisma.account.delete({ where: { id } });
    res.json({ success: true, message: 'Account deleted.' });
  } catch (err) {
    return handleDbError(err, res, 'Failed to delete account');
  }
});

export default router;

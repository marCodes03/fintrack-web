import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { mockTransactions, mockAccounts, handleDbError } from '../mockStore';

const router = Router();

// GET /api/transactions
router.get('/', async (req: Request, res: Response) => {
  const userId = req.query['userId'] as string;
  try {
    const transactions = await prisma.transaction.findMany({
      where: userId ? { userId } : {},
      orderBy: { date: 'desc' }
    });
    res.json({ success: true, data: transactions });
  } catch (_err) {
    const filtered = userId ? mockTransactions.filter(t => t.userId === userId) : mockTransactions;
    res.json({ success: true, data: filtered });
  }
});

// POST /api/transactions
router.post('/', async (req: Request, res: Response) => {
  const { description, amount, type, expenseType, category, accountId, toAccountId, transferFee, expenseDate, userId } = req.body;

  if (!description || amount === undefined || !type) {
    res.status(400).json({ success: false, message: 'Description, amount, and type are required.' });
    return;
  }

  const numericAmount = parseFloat(amount);
  const numericFee = parseFloat(transferFee) || 0;

  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) targetUserId = defaultUser.id;
    }

    if (targetUserId) {
      const result = await prisma.$transaction(async (tx) => {
        // Zero-balance enforcement for NON-CREDIT accounts
        if (accountId && (type === 'EXPENSE' || type === 'TRANSFER' || (type === 'SAVINGS' && toAccountId))) {
          const srcAcc = await tx.account.findUnique({ where: { id: accountId } });
          if (srcAcc && srcAcc.type !== 'CREDIT') {
            const requiredAmount = type === 'TRANSFER' ? (numericAmount + numericFee) : numericAmount;
            if (srcAcc.balance < requiredAmount) {
              throw new Error(`Insufficient account balance (₱${srcAcc.balance.toFixed(2)}). Non-credit accounts cannot have negative balances.`);
            }
          }
        }

        const transaction = await tx.transaction.create({
          data: {
            description,
            amount: numericAmount,
            type,
            expenseType: type === 'EXPENSE' ? (expenseType || 'VARIABLE') : null,
            category: category || 'General',
            accountId: accountId || null,
            toAccountId: toAccountId || null,
            transferFee: numericFee,
            expenseDate: expenseDate ? new Date(expenseDate) : null,
            userId: targetUserId
          }
        });

        if (type === 'INCOME' && accountId) {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { increment: numericAmount } }
          });
        } else if (type === 'EXPENSE' && accountId) {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { decrement: numericAmount } }
          });
        } else if (type === 'SAVINGS' && accountId && toAccountId) {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { decrement: numericAmount } }
          });
          await tx.account.update({
            where: { id: toAccountId },
            data: { balance: { increment: numericAmount } }
          });
        } else if (type === 'SAVINGS' && accountId) {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { increment: numericAmount } }
          });
        } else if (type === 'TRANSFER' && accountId && toAccountId) {
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { decrement: numericAmount + numericFee } }
          });
          await tx.account.update({
            where: { id: toAccountId },
            data: { balance: { increment: numericAmount } }
          });
        }

        return transaction;
      });

      res.status(201).json({ success: true, data: result });
      return;
    }
  } catch (err: any) {
    console.error('Prisma Error in POST /api/transactions:', err);
    if (err.message && err.message.includes('Insufficient account balance')) {
      res.status(400).json({ success: false, message: err.message });
      return;
    }
    return handleDbError(err, res, 'Failed to create transaction');
  }

  // Fallback mode
  if (accountId && (type === 'EXPENSE' || type === 'TRANSFER' || (type === 'SAVINGS' && toAccountId))) {
    const srcAcc = mockAccounts.find(a => a.id === accountId);
    if (srcAcc && srcAcc.type !== 'CREDIT') {
      const requiredAmount = type === 'TRANSFER' ? (numericAmount + numericFee) : numericAmount;
      if (srcAcc.balance < requiredAmount) {
        res.status(400).json({ success: false, message: `Insufficient account balance (₱${srcAcc.balance.toFixed(2)}). Non-credit accounts cannot have negative balances.` });
        return;
      }
    }
  }

  const newTx = {
    id: `tx-mock-${Date.now()}`,
    description,
    amount: numericAmount,
    type,
    expenseType: type === 'EXPENSE' ? (expenseType || 'VARIABLE') : null,
    category: category || 'General',
    accountId,
    toAccountId,
    transferFee: numericFee,
    expenseDate,
    date: new Date().toISOString()
  };

  mockTransactions.unshift(newTx);

  if (type === 'INCOME' && accountId) {
    const acc = mockAccounts.find(a => a.id === accountId);
    if (acc) acc.balance += numericAmount;
  } else if (type === 'EXPENSE' && accountId) {
    const acc = mockAccounts.find(a => a.id === accountId);
    if (acc) acc.balance -= numericAmount;
  } else if (type === 'SAVINGS' && accountId && toAccountId) {
    const srcAcc = mockAccounts.find(a => a.id === accountId);
    const destAcc = mockAccounts.find(a => a.id === toAccountId);
    if (srcAcc) srcAcc.balance -= numericAmount;
    if (destAcc) destAcc.balance += numericAmount;
  } else if (type === 'SAVINGS' && accountId) {
    const acc = mockAccounts.find(a => a.id === accountId);
    if (acc) acc.balance += numericAmount;
  } else if (type === 'TRANSFER' && accountId && toAccountId) {
    const srcAcc = mockAccounts.find(a => a.id === accountId);
    const destAcc = mockAccounts.find(a => a.id === toAccountId);
    if (srcAcc) srcAcc.balance -= (numericAmount + numericFee);
    if (destAcc) destAcc.balance += numericAmount;
  }

  res.status(201).json({ success: true, data: newTx });
});

// PUT /api/transactions/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { description, amount, category, accountId, expenseDate } = req.body;

  try {
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        description,
        amount: parseFloat(amount),
        category,
        accountId: accountId || null,
        expenseDate: expenseDate ? new Date(expenseDate) : null
      }
    });
    res.json({ success: true, data: updated });
  } catch (_err) {
    const idx = mockTransactions.findIndex(t => t.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Transaction not found.' });
      return;
    }
    mockTransactions[idx] = {
      ...mockTransactions[idx],
      description,
      amount: parseFloat(amount),
      category,
      accountId,
      expenseDate
    };
    res.json({ success: true, data: mockTransactions[idx] });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  try {
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      res.status(404).json({ success: false, message: 'Transaction not found.' });
      return;
    }

    await prisma.$transaction(async (prismaTx) => {
      // Balance rollback on deletion
      if (tx.type === 'INCOME' && tx.accountId) {
        await prismaTx.account.update({
          where: { id: tx.accountId },
          data: { balance: { decrement: tx.amount } }
        });
      } else if (tx.type === 'SAVINGS' && tx.accountId && tx.toAccountId) {
        await prismaTx.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: tx.amount } }
        });
        await prismaTx.account.update({
          where: { id: tx.toAccountId },
          data: { balance: { decrement: tx.amount } }
        });
      } else if (tx.type === 'SAVINGS' && tx.accountId) {
        await prismaTx.account.update({
          where: { id: tx.accountId },
          data: { balance: { decrement: tx.amount } }
        });
      } else if (tx.type === 'EXPENSE' && tx.accountId) {
        await prismaTx.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: tx.amount } }
        });
      } else if (tx.type === 'TRANSFER' && tx.accountId && tx.toAccountId) {
        await prismaTx.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: tx.amount + tx.transferFee } }
        });
        await prismaTx.account.update({
          where: { id: tx.toAccountId },
          data: { balance: { decrement: tx.amount } }
        });
      }

      await prismaTx.transaction.delete({ where: { id } });
    });

    res.json({ success: true, message: 'Transaction deleted and account balance updated.' });
  } catch (_err) {
    const idx = mockTransactions.findIndex(t => t.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Transaction not found.' });
      return;
    }
    const tx = mockTransactions[idx];
    if (tx.type === 'INCOME' && tx.accountId) {
      const acc = mockAccounts.find(a => a.id === tx.accountId);
      if (acc) acc.balance -= tx.amount;
    } else if (tx.type === 'SAVINGS' && tx.accountId && tx.toAccountId) {
      const srcAcc = mockAccounts.find(a => a.id === tx.accountId);
      const destAcc = mockAccounts.find(a => a.id === tx.toAccountId);
      if (srcAcc) srcAcc.balance += tx.amount;
      if (destAcc) destAcc.balance -= tx.amount;
    } else if (tx.type === 'SAVINGS' && tx.accountId) {
      const acc = mockAccounts.find(a => a.id === tx.accountId);
      if (acc) acc.balance -= tx.amount;
    } else if (tx.type === 'EXPENSE' && tx.accountId) {
      const acc = mockAccounts.find(a => a.id === tx.accountId);
      if (acc) acc.balance += tx.amount;
    } else if (tx.type === 'TRANSFER' && tx.accountId && tx.toAccountId) {
      const srcAcc = mockAccounts.find(a => a.id === tx.accountId);
      const destAcc = mockAccounts.find(a => a.id === tx.toAccountId);
      if (srcAcc) srcAcc.balance += (tx.amount + tx.transferFee);
      if (destAcc) destAcc.balance -= tx.amount;
    }
    mockTransactions.splice(idx, 1);
    res.json({ success: true, message: 'Transaction deleted (Fallback).' });
  }
});

// POST /api/transactions/bulk-delete
router.post('/bulk-delete', async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, message: 'Invalid transaction IDs.' });
    return;
  }

  try {
    await prisma.$transaction(async (prismaTx) => {
      for (const id of ids) {
        const tx = await prismaTx.transaction.findUnique({ where: { id } });
        if (tx) {
          // Balance rollback on deletion
          if (tx.type === 'INCOME' && tx.accountId) {
            await prismaTx.account.update({
              where: { id: tx.accountId },
              data: { balance: { decrement: tx.amount } }
            });
          } else if (tx.type === 'SAVINGS' && tx.accountId && tx.toAccountId) {
            await prismaTx.account.update({
              where: { id: tx.accountId },
              data: { balance: { increment: tx.amount } }
            });
            await prismaTx.account.update({
              where: { id: tx.toAccountId },
              data: { balance: { decrement: tx.amount } }
            });
          } else if (tx.type === 'SAVINGS' && tx.accountId) {
            await prismaTx.account.update({
              where: { id: tx.accountId },
              data: { balance: { decrement: tx.amount } }
            });
          } else if (tx.type === 'EXPENSE' && tx.accountId) {
            await prismaTx.account.update({
              where: { id: tx.accountId },
              data: { balance: { increment: tx.amount } }
            });
          } else if (tx.type === 'TRANSFER' && tx.accountId && tx.toAccountId) {
            await prismaTx.account.update({
              where: { id: tx.accountId },
              data: { balance: { increment: tx.amount + tx.transferFee } }
            });
            await prismaTx.account.update({
              where: { id: tx.toAccountId },
              data: { balance: { decrement: tx.amount } }
            });
          }
          await prismaTx.transaction.delete({ where: { id } });
        }
      }
    });

    res.json({ success: true, message: `${ids.length} transactions deleted and account balances updated.` });
  } catch (_err) {
    // Fallback: mock deletion
    for (const id of ids) {
      const idx = mockTransactions.findIndex(t => t.id === id);
      if (idx !== -1) {
        const tx = mockTransactions[idx];
        if (tx.type === 'INCOME' && tx.accountId) {
          const acc = mockAccounts.find(a => a.id === tx.accountId);
          if (acc) acc.balance -= tx.amount;
        } else if (tx.type === 'SAVINGS' && tx.accountId && tx.toAccountId) {
          const srcAcc = mockAccounts.find(a => a.id === tx.accountId);
          const destAcc = mockAccounts.find(a => a.id === tx.toAccountId);
          if (srcAcc) srcAcc.balance += tx.amount;
          if (destAcc) destAcc.balance -= tx.amount;
        } else if (tx.type === 'SAVINGS' && tx.accountId) {
          const acc = mockAccounts.find(a => a.id === tx.accountId);
          if (acc) acc.balance -= tx.amount;
        } else if (tx.type === 'EXPENSE' && tx.accountId) {
          const acc = mockAccounts.find(a => a.id === tx.accountId);
          if (acc) acc.balance += tx.amount;
        } else if (tx.type === 'TRANSFER' && tx.accountId && tx.toAccountId) {
          const srcAcc = mockAccounts.find(a => a.id === tx.accountId);
          const destAcc = mockAccounts.find(a => a.id === tx.toAccountId);
          if (srcAcc) srcAcc.balance += (tx.amount + tx.transferFee);
          if (destAcc) destAcc.balance -= tx.amount;
        }
        mockTransactions.splice(idx, 1);
      }
    }
    res.json({ success: true, message: `${ids.length} transactions deleted (Fallback).` });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { mockAccounts, handleDbError } from '../mockStore';

const router = Router();

// GET /api/accounts
router.get('/', async (req: Request, res: Response) => {
  const userId = req.query['userId'] as string;
  try {
    const accounts = await prisma.account.findMany({
      where: userId ? { userId } : {},
      orderBy: { updatedDate: 'desc' }
    });
    res.json({ success: true, data: accounts });
  } catch (_err) {
    const filtered = userId ? mockAccounts.filter(a => a.userId === userId) : mockAccounts;
    res.json({ success: true, data: filtered });
  }
});

// POST /api/accounts
router.post('/', async (req: Request, res: Response) => {
  const { name, type, balance, currency, userId } = req.body;
  if (!name || !type) {
    res.status(400).json({ success: false, message: 'Name and type are required.' });
    return;
  }

  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) targetUserId = defaultUser.id;
    }

    if (targetUserId) {
      const newAcc = await prisma.account.create({
        data: {
          name,
          type,
          balance: parseFloat(balance) || 0,
          currency: currency || 'PHP',
          userId: targetUserId
        }
      });
      res.status(201).json({ success: true, data: newAcc });
      return;
    }
  } catch (err) {
    console.warn('DB error on create account, using fallback array');
  }

  const newAcc = {
    id: `acc-mock-${Date.now()}`,
    name,
    type,
    balance: parseFloat(balance) || 0,
    currency: currency || 'PHP',
    userId: userId || 'user-default-1',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  };
  mockAccounts.push(newAcc);
  res.status(201).json({ success: true, data: newAcc });
});

// PUT /api/accounts/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { name, type, balance } = req.body;

  try {
    const updated = await prisma.account.update({
      where: { id },
      data: {
        name,
        type,
        ...(balance !== undefined && { balance: parseFloat(balance) })
      }
    });
    res.json({ success: true, data: updated });
  } catch (_err) {
    const idx = mockAccounts.findIndex(a => a.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }
    mockAccounts[idx] = {
      ...mockAccounts[idx],
      name,
      type,
      ...(balance !== undefined && { balance: parseFloat(balance) }),
      updatedDate: new Date().toISOString()
    };
    res.json({ success: true, data: mockAccounts[idx] });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  try {
    const acc = await prisma.account.findUnique({ where: { id } });
    if (!acc) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }
    if (acc.balance !== 0) {
      res.status(400).json({ success: false, message: 'Cannot delete account with a non-zero balance.' });
      return;
    }

    await prisma.account.delete({ where: { id } });
    res.json({ success: true, message: 'Account deleted.' });
  } catch (_err) {
    const idx = mockAccounts.findIndex(a => a.id === id);
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
  }
});

export default router;

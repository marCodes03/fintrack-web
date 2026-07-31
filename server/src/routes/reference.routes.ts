import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import {
  mockIncomeCategories,
  mockExpenseCategories,
  mockSavingCategories,
  mockRecurrenceIntervals,
  mockAccountTypes,
  mockTransactions
} from '../mockStore';

const router = Router();

// RefIncomeCategory
router.get('/income-categories', async (_req: Request, res: Response) => {
  try {
    const items = await (prisma as any).refIncomeCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: items });
  } catch (_err) {
    res.json({ success: true, data: mockIncomeCategories });
  }
});

router.post('/income-categories', async (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ success: false, message: 'Name is required.' }); return; }
  try {
    const item = await (prisma as any).refIncomeCategory.create({ data: { name, description: description || null, isActive: true } });
    res.status(201).json({ success: true, data: item });
  } catch (_err) {
    const newItem = { id: `ic-mock-${Date.now()}`, name, description: description || '', isActive: true, createdDate: new Date().toISOString(), updatedDate: new Date().toISOString() };
    mockIncomeCategories.push(newItem);
    res.status(201).json({ success: true, data: newItem });
  }
});

router.put('/income-categories/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { name, description, isActive } = req.body;
  try {
    const item = await (prisma as any).refIncomeCategory.update({ where: { id }, data: { name, description: description ?? null, isActive: isActive ?? true } });
    res.json({ success: true, data: item });
  } catch (_err) {
    const idx = mockIncomeCategories.findIndex(i => i.id === id);
    if (idx === -1) { res.status(404).json({ success: false, message: 'Not found.' }); return; }
    mockIncomeCategories[idx] = { ...mockIncomeCategories[idx], name, description, isActive, updatedDate: new Date().toISOString() };
    res.json({ success: true, data: mockIncomeCategories[idx] });
  }
});

router.delete('/income-categories/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  try {
    const cat = await (prisma as any).refIncomeCategory.findUnique({ where: { id } });
    if (!cat) { res.status(404).json({ success: false, message: 'Category not found.' }); return; }
    const usageCount = await (prisma as any).transaction.count({ where: { category: cat.name, type: 'INCOME' } });
    if (usageCount > 0) { res.status(400).json({ success: false, message: `Cannot delete "${cat.name}" — it is used by ${usageCount} income transaction(s).` }); return; }
    await (prisma as any).refIncomeCategory.delete({ where: { id } });
    res.json({ success: true, message: 'Deleted.' });
  } catch (_err) {
    const idx = mockIncomeCategories.findIndex(i => i.id === id);
    if (idx === -1) { res.status(404).json({ success: false, message: 'Not found.' }); return; }
    const catName = mockIncomeCategories[idx].name;
    const inUse = mockTransactions.filter(t => t.category === catName && t.type === 'INCOME').length;
    if (inUse > 0) { res.status(400).json({ success: false, message: `Cannot delete "${catName}" — used by ${inUse} transaction(s).` }); return; }
    mockIncomeCategories.splice(idx, 1);
    res.json({ success: true, message: 'Deleted (Fallback).' });
  }
});

// RefExpenseCategory
router.get('/expense-categories', async (_req: Request, res: Response) => {
  try {
    const items = await (prisma as any).refExpenseCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: items });
  } catch (_err) {
    res.json({ success: true, data: mockExpenseCategories });
  }
});

router.post('/expense-categories', async (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ success: false, message: 'Name is required.' }); return; }
  try {
    const item = await (prisma as any).refExpenseCategory.create({ data: { name, description: description || null, isActive: true } });
    res.status(201).json({ success: true, data: item });
  } catch (_err) {
    const newItem = { id: `ec-mock-${Date.now()}`, name, description: description || '', isActive: true, createdDate: new Date().toISOString(), updatedDate: new Date().toISOString() };
    mockExpenseCategories.push(newItem);
    res.status(201).json({ success: true, data: newItem });
  }
});

router.put('/expense-categories/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { name, description, isActive } = req.body;
  try {
    const item = await (prisma as any).refExpenseCategory.update({ where: { id }, data: { name, description: description ?? null, isActive: isActive ?? true } });
    res.json({ success: true, data: item });
  } catch (_err) {
    const idx = mockExpenseCategories.findIndex(i => i.id === id);
    if (idx === -1) { res.status(404).json({ success: false, message: 'Not found.' }); return; }
    mockExpenseCategories[idx] = { ...mockExpenseCategories[idx], name, description, isActive, updatedDate: new Date().toISOString() };
    res.json({ success: true, data: mockExpenseCategories[idx] });
  }
});

router.delete('/expense-categories/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  try {
    const cat = await (prisma as any).refExpenseCategory.findUnique({ where: { id } });
    if (!cat) { res.status(404).json({ success: false, message: 'Category not found.' }); return; }
    const usageCount = await (prisma as any).transaction.count({ where: { category: cat.name, type: 'EXPENSE' } });
    if (usageCount > 0) { res.status(400).json({ success: false, message: `Cannot delete "${cat.name}" — it is used by ${usageCount} expense transaction(s).` }); return; }
    await (prisma as any).refExpenseCategory.delete({ where: { id } });
    res.json({ success: true, message: 'Deleted.' });
  } catch (_err) {
    const idx = mockExpenseCategories.findIndex(i => i.id === id);
    if (idx === -1) { res.status(404).json({ success: false, message: 'Not found.' }); return; }
    const catName = mockExpenseCategories[idx].name;
    const inUse = mockTransactions.filter(t => t.category === catName && t.type === 'EXPENSE').length;
    if (inUse > 0) { res.status(400).json({ success: false, message: `Cannot delete "${catName}" — used by ${inUse} transaction(s).` }); return; }
    mockExpenseCategories.splice(idx, 1);
    res.json({ success: true, message: 'Deleted (Fallback).' });
  }
});

// RefSavingCategory
router.get('/saving-categories', async (_req: Request, res: Response) => {
  try {
    const items = await (prisma as any).refSavingCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: items });
  } catch (_err) {
    res.json({ success: true, data: mockSavingCategories });
  }
});

router.post('/saving-categories', async (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ success: false, message: 'Name is required.' }); return; }
  try {
    const item = await (prisma as any).refSavingCategory.create({ data: { name, description: description || null, isActive: true } });
    res.status(201).json({ success: true, data: item });
  } catch (_err) {
    const newItem = { id: `sc-mock-${Date.now()}`, name, description: description || '', isActive: true, createdDate: new Date().toISOString(), updatedDate: new Date().toISOString() };
    mockSavingCategories.push(newItem);
    res.status(201).json({ success: true, data: newItem });
  }
});

router.put('/saving-categories/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { name, description, isActive } = req.body;
  try {
    const item = await (prisma as any).refSavingCategory.update({ where: { id }, data: { name, description: description ?? null, isActive: isActive ?? true } });
    res.json({ success: true, data: item });
  } catch (_err) {
    const idx = mockSavingCategories.findIndex(i => i.id === id);
    if (idx === -1) { res.status(404).json({ success: false, message: 'Not found.' }); return; }
    mockSavingCategories[idx] = { ...mockSavingCategories[idx], name, description, isActive, updatedDate: new Date().toISOString() };
    res.json({ success: true, data: mockSavingCategories[idx] });
  }
});

router.delete('/saving-categories/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  try {
    const cat = await (prisma as any).refSavingCategory.findUnique({ where: { id } });
    if (!cat) { res.status(404).json({ success: false, message: 'Category not found.' }); return; }
    const usageCount = await (prisma as any).transaction.count({ where: { category: cat.name, type: 'SAVINGS' } });
    if (usageCount > 0) { res.status(400).json({ success: false, message: `Cannot delete "${cat.name}" — it is used by ${usageCount} savings transaction(s).` }); return; }
    await (prisma as any).refSavingCategory.delete({ where: { id } });
    res.json({ success: true, message: 'Deleted.' });
  } catch (_err) {
    const idx = mockSavingCategories.findIndex(i => i.id === id);
    if (idx === -1) { res.status(404).json({ success: false, message: 'Not found.' }); return; }
    const catName = mockSavingCategories[idx].name;
    const inUse = mockTransactions.filter(t => t.category === catName && t.type === 'SAVINGS').length;
    if (inUse > 0) { res.status(400).json({ success: false, message: `Cannot delete "${catName}" — used by ${inUse} transaction(s).` }); return; }
    mockSavingCategories.splice(idx, 1);
    res.json({ success: true, message: 'Deleted (Fallback).' });
  }
});

// RefRecurrenceInterval (read-only)
router.get('/recurrence-intervals', async (_req: Request, res: Response) => {
  try {
    const items = await (prisma as any).refRecurrenceInterval.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: items });
  } catch (_err) {
    res.json({ success: true, data: mockRecurrenceIntervals });
  }
});

// RefAccountType (read-only)
router.get('/account-types', async (_req: Request, res: Response) => {
  try {
    const items = await (prisma as any).refAccountType.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: items });
  } catch (_err) {
    res.json({ success: true, data: mockAccountTypes });
  }
});

export default router;

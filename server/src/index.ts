import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './prisma';

import authRouter from './routes/auth.routes';
import accountsRouter from './routes/accounts.routes';
import transactionsRouter from './routes/transactions.routes';
import budgetsRouter from './routes/budgets.routes';
import referenceRouter from './routes/reference.routes';
import reviewsRouter from './routes/reviews.routes';

const app = express();
const PORT = process.env['PORT'] || 3000;

app.use(cors());
app.use(express.json());

// Mount Modular Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/refs', referenceRouter);
app.use('/api', budgetsRouter);
app.use('/api/reviews', reviewsRouter);

// Health check endpoint with database ping
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'PostgreSQL 16 (Connected)',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'PostgreSQL Disconnected / Error',
      error: (err as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 FinTrack Server running on http://localhost:${PORT}`);
});

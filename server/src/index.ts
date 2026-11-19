import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { csrfGuard } from './middleware/csrf.middleware';
import { prisma } from './prisma';

import authRouter from './routes/auth.routes';
import accountsRouter from './routes/accounts.routes';
import transactionsRouter from './routes/transactions.routes';
import budgetsRouter from './routes/budgets.routes';
import referenceRouter from './routes/reference.routes';
import reviewsRouter from './routes/reviews.routes';

if (!process.env['JWT_SECRET']) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

const app = express();
const PORT = process.env['PORT'] || 3000;

// Reverse-proxy hops in front of the app: Vercel rewrite, then Render's proxy. Used for the real
// client IP in rate limiting. Set TRUST_PROXY_HOPS=1 locally behind a single proxy, 0 with none.
const trustProxyHops = parseInt(process.env['TRUST_PROXY_HOPS'] ?? '2', 10);
app.set('trust proxy', Number.isNaN(trustProxyHops) ? 2 : trustProxyHops);

// Cookie auth needs credentialed CORS, which requires explicit origins (never '*').
// Production calls arrive same-origin through the Vercel /api rewrite, so only dev origins are needed.
const allowedOrigins = (process.env['CORS_ORIGINS'] || 'http://localhost:4200')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const localDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    // No Origin header: same-origin requests, curl, server-to-server.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    // Any localhost port is fine for local development, never in production.
    if (process.env['NODE_ENV'] !== 'production' && localDevOrigin.test(origin)) return callback(null, true);
    return callback(null, false);
  }
}));
app.use(express.json());
app.use(cookieParser());
app.use(csrfGuard);

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

import { Prisma } from '@prisma/client';

const CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

/** True when the error means the database is unreachable (not a query/constraint error). */
export function isDbConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) return CONNECTION_ERROR_CODES.has(err.code);
  return false;
}

/** The in-memory mock fallback is a dev aid: never in production, and only when the DB is unreachable. */
export function canUseMockFallback(err: unknown): boolean {
  return process.env['NODE_ENV'] !== 'production' && isDbConnectionError(err);
}

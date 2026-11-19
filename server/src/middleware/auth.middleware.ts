import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AUTH_COOKIE } from '../utils/authCookie';

/** Reads the session token from the httpOnly cookie, falling back to a Bearer header (API clients). */
function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE];
  if (typeof cookieToken === 'string' && cookieToken) return cookieToken;
  const header = req.headers['authorization'];
  const match = typeof header === 'string' ? /^Bearer (.+)$/i.exec(header) : null;
  return match ? match[1] : null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Not authenticated.' });
    return;
  }
  req.userId = userId;
  next();
}

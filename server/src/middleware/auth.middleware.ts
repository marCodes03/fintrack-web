import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['authorization'];
  const match = typeof header === 'string' ? /^Bearer (.+)$/i.exec(header) : null;
  const userId = match ? verifyToken(match[1]) : null;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Not authenticated.' });
    return;
  }
  req.userId = userId;
  next();
}

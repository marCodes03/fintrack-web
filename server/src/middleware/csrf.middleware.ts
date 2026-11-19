import { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE } from '../utils/authCookie';

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'fintrack';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defense in depth on top of SameSite=Lax: a state-changing request that carries the session
 * cookie must also send `X-Requested-With: fintrack`. Browsers only allow a cross-origin page to
 * set a custom header after a CORS preflight, which our allowlist rejects.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || !req.cookies?.[AUTH_COOKIE]) {
    next();
    return;
  }
  if (req.headers[CSRF_HEADER] !== CSRF_VALUE) {
    res.status(403).json({ success: false, message: 'Missing or invalid request header.' });
    return;
  }
  next();
}

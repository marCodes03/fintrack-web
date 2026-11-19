import { Response, CookieOptions } from 'express';
import { TOKEN_EXPIRY } from './jwt';

export const AUTH_COOKIE = 'fintrack_token';

// Keep the cookie lifetime in step with the JWT lifetime ('6h').
const MAX_AGE_MS = (parseInt(TOKEN_EXPIRY, 10) || 6) * 60 * 60 * 1000;

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    // Lax: the app calls the API same-origin (Vercel /api rewrite) or same-site (localhost).
    sameSite: 'lax',
    path: '/'
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}

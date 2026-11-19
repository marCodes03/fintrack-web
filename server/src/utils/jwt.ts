import jwt from 'jsonwebtoken';

// Token lifetime. Matches the Angular client's 6h inactivity limit so the limit can't be bypassed
// by calling the API directly with an old token.
export const TOKEN_EXPIRY = '6h';

export function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return secret;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: TOKEN_EXPIRY, algorithm: 'HS256' });
}

/** Returns the userId (`sub` claim), or null if the token is invalid/expired. Never throws. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (typeof payload === 'object' && typeof payload.sub === 'string') return payload.sub;
    return null;
  } catch {
    return null;
  }
}

import jwt from 'jsonwebtoken';

// Token lifetime. Kept at 7 days; the Angular client additionally logs out after 6h of inactivity.
export const TOKEN_EXPIRY = '7d';

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

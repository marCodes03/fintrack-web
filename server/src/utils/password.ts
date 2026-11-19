import bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'crypto';

const COST = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a password against a stored value. Legacy rows hold plaintext; those still verify
 * but are flagged `needsUpgrade` so the caller can re-save them as a bcrypt hash.
 */
export async function verifyPassword(plain: string, stored: string): Promise<{ ok: boolean; needsUpgrade: boolean }> {
  if (typeof plain !== 'string' || typeof stored !== 'string') return { ok: false, needsUpgrade: false };
  if (stored.startsWith('$2')) {
    return { ok: await bcrypt.compare(plain, stored), needsUpgrade: false };
  }
  const ok = safeEqual(plain, stored);
  return { ok, needsUpgrade: ok };
}

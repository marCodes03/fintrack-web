import { Router, Request, Response } from 'express';
import { randomInt } from 'crypto';
import { prisma } from '../prisma';
import { mockUsers, activeOtps, handleDbError } from '../mockStore';
import { sendOtpEmail, OtpPurpose } from '../services/email.service';
import { signToken } from '../utils/jwt';
import { hashPassword, verifyPassword, safeEqual } from '../utils/password';
import { canUseMockFallback } from '../utils/dbErrors';
import { requireAuth } from '../middleware/auth.middleware';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie';
import { credentialsLimiter, forgotPasswordLimiter, resetLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const isDevEnv = () => process.env['NODE_ENV'] !== 'production';

/** Creates a fresh OTP for (purpose, email), emails it, and returns it. SMTP failures are logged, not thrown. */
async function issueOtp(purpose: OtpPurpose, email: string): Promise<string> {
  const otp = randomInt(100000, 1000000).toString();
  activeOtps.set(`${purpose}:${email}`, { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  try {
    await sendOtpEmail(email, otp, purpose);
  } catch (err) {
    // Not surfaced to the client: an error only for existing accounts would reveal which emails exist.
    console.error('Failed to send OTP email:', (err as Error).message);
  }
  return otp;
}

/** True if `otp` matches the live code. Counts failures and burns the code after too many. Caller deletes on success. */
function checkOtp(purpose: OtpPurpose, email: string, otp: string): boolean {
  const key = `${purpose}:${email}`;
  const entry = activeOtps.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    activeOtps.delete(key);
    return false;
  }
  if (!safeEqual(entry.otp, otp)) {
    entry.attempts += 1;
    if (entry.attempts >= OTP_MAX_ATTEMPTS) activeOtps.delete(key);
    return false;
  }
  return true;
}

// 1. Register
router.post('/register', credentialsLimiter, async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'All fields are required.' });
    return;
  }

  const passwordHash = await hashPassword(String(password));

  let newUser: { id: string; name: string; email: string };
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User with this email already exists.' });
      return;
    }

    newUser = await prisma.user.create({
      data: { name, email, password: passwordHash, emailVerified: false }
    });
  } catch (err) {
    if (!canUseMockFallback(err)) {
      return handleDbError(err, res, 'Failed to register');
    }
    // Dev-only fallback if database is offline
    const existing = mockUsers.find(u => u.email === email);
    if (existing) {
      res.status(400).json({ success: false, message: 'User with this email already exists.' });
      return;
    }
    newUser = { id: `user-mock-${Date.now()}`, name, email };
    mockUsers.push({ ...newUser, password: passwordHash, emailVerified: false });
  }

  // No session yet: the account must verify its email first.
  const otp = await issueOtp('verify', newUser.email);
  res.status(201).json({
    success: true,
    message: 'Registration successful. Enter the verification code we emailed you.',
    requiresVerification: true,
    email: newUser.email,
    ...(isDevEnv() ? { simulatedOtp: otp } : {})
  });
});

// 2. Login
router.post('/login', credentialsLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required.' });
    return;
  }

  let user: { id: string; name: string; email: string };
  try {
    const dbUser = await prisma.user.findUnique({ where: { email } });
    const check = dbUser ? await verifyPassword(String(password), dbUser.password) : { ok: false, needsUpgrade: false };
    if (!dbUser || !check.ok) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }
    if (check.needsUpgrade) {
      // Legacy plaintext password: re-save as a bcrypt hash now that it has been verified.
      await prisma.user.update({ where: { id: dbUser.id }, data: { password: await hashPassword(String(password)) } });
    }
    if (!dbUser.emailVerified) {
      res.status(403).json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before logging in.' });
      return;
    }
    user = dbUser;
  } catch (err) {
    if (!canUseMockFallback(err)) {
      return handleDbError(err, res, 'Failed to log in');
    }
    const mockUser = mockUsers.find(u => u.email === email);
    const check = mockUser ? await verifyPassword(String(password), mockUser.password) : { ok: false, needsUpgrade: false };
    if (!mockUser || !check.ok) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }
    if (check.needsUpgrade) mockUser.password = await hashPassword(String(password));
    if (mockUser.emailVerified === false) {
      res.status(403).json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before logging in.' });
      return;
    }
    user = mockUser;
  }

  // Sign outside the DB try/catch so a signing failure never triggers the mock fallback.
  setAuthCookie(res, signToken(user.id));
  res.json({
    success: true,
    message: 'Login successful.',
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// 3. Forgot Password
router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required.' });
    return;
  }

  // Check if user exists in Prisma DB or (dev-only) mock store
  let userExists = false;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) userExists = true;
  } catch (err) {
    if (!canUseMockFallback(err)) {
      return handleDbError(err, res, 'Failed to look up account');
    }
    if (mockUsers.find(u => u.email === email)) userExists = true;
  }

  // Same response whether or not the account exists, so this can't be used to enumerate emails.
  const genericMessage = 'If an account exists for this email, a verification code has been sent.';
  if (!userExists) {
    res.json({ success: true, message: genericMessage });
    return;
  }

  const otp = await issueOtp('reset', email);

  res.json({
    success: true,
    message: genericMessage,
    // Dev aid so the UI works without SMTP. Never returned in production.
    ...(isDevEnv() ? { simulatedOtp: otp } : {})
  });
});

// 3a. Verify email with the OTP sent at registration, then start a session
router.post('/verify-email', resetLimiter, async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    return;
  }
  if (!checkOtp('verify', email, String(otp))) {
    res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    return;
  }

  let user: { id: string; name: string; email: string };
  try {
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser) {
      res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
      return;
    }
    user = await prisma.user.update({ where: { email }, data: { emailVerified: true } });
  } catch (err) {
    if (!canUseMockFallback(err)) {
      return handleDbError(err, res, 'Failed to verify email');
    }
    const mockUser = mockUsers.find(u => u.email === email);
    if (!mockUser) {
      res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
      return;
    }
    mockUser.emailVerified = true;
    user = mockUser;
  }

  activeOtps.delete(`verify:${email}`);
  setAuthCookie(res, signToken(user.id));
  res.json({
    success: true,
    message: 'Email verified.',
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// 3a-2. Resend the verification code (same response whether or not the account exists)
router.post('/resend-verification', forgotPasswordLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required.' });
    return;
  }

  let needsCode = false;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    needsCode = !!user && !user.emailVerified;
  } catch (err) {
    if (!canUseMockFallback(err)) {
      return handleDbError(err, res, 'Failed to look up account');
    }
    needsCode = mockUsers.some(u => u.email === email && u.emailVerified === false);
  }

  const otp = needsCode ? await issueOtp('verify', email) : null;
  res.json({
    success: true,
    message: 'If this account is waiting for verification, a new code has been sent.',
    ...(isDevEnv() && otp ? { simulatedOtp: otp } : {})
  });
});

// 3b. Refresh: exchange a still-valid token for a fresh one (sliding session)
router.post('/refresh', requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId as string;
  try {
    // Real users must still exist; mock users (dev fallback) have no DB row.
    if (!userId.startsWith('user-mock-') && !mockUsers.some(u => u.id === userId)) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }
    }
  } catch (err) {
    return handleDbError(err, res, 'Failed to refresh session');
  }
  setAuthCookie(res, signToken(userId));
  res.json({ success: true });
});

// 3c. Logout: clear the session cookie
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

// 4. Verify OTP & Reset Password (Unauthenticated OTP-based reset)
router.post('/reset-password-otp', resetLimiter, async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    return;
  }

  if (!checkOtp('reset', email, String(otp))) {
    res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    return;
  }

  try {
    const passwordHash = await hashPassword(String(newPassword));
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Receiving the reset code proves control of the email, so the account counts as verified.
      await prisma.user.update({
        where: { email },
        data: { password: passwordHash, emailVerified: true }
      });
    } else {
      const mockUser = mockUsers.find(u => u.email === email);
      if (mockUser) {
        mockUser.password = passwordHash;
        mockUser.emailVerified = true;
      }
    }

    activeOtps.delete(`reset:${email}`);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    handleDbError(err, res, 'Failed to reset password');
  }
});

// 5. Change Password (Authenticated reset using current password)
router.post('/reset-password', resetLimiter, async (req: Request, res: Response) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword || !newPassword) {
    res.status(400).json({ success: false, message: 'Email, current password, and new password are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const check = await verifyPassword(String(currentPassword), user.password);
      if (!check.ok) {
        res.status(400).json({ success: false, message: 'Incorrect current password.' });
        return;
      }
      await prisma.user.update({
        where: { email },
        data: { password: await hashPassword(String(newPassword)) }
      });
    } else {
      const mockUser = mockUsers.find(u => u.email === email);
      const check = mockUser ? await verifyPassword(String(currentPassword), mockUser.password) : { ok: false };
      if (!mockUser || !check.ok) {
        res.status(400).json({ success: false, message: 'Incorrect current password.' });
        return;
      }
      mockUser.password = await hashPassword(String(newPassword));
    }

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    handleDbError(err, res, 'Failed to update password');
  }
});

export default router;

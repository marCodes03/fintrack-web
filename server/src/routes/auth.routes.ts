import { Router, Request, Response } from 'express';
import { randomInt } from 'crypto';
import { prisma } from '../prisma';
import { mockUsers, activeOtps, handleDbError } from '../mockStore';
import { sendOtpEmail } from '../services/email.service';
import { signToken } from '../utils/jwt';
import { hashPassword, verifyPassword, safeEqual } from '../utils/password';
import { canUseMockFallback } from '../utils/dbErrors';
import { requireAuth } from '../middleware/auth.middleware';
import { credentialsLimiter, forgotPasswordLimiter, resetLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

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
      data: { name, email, password: passwordHash }
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
    mockUsers.push({ ...newUser, password: passwordHash });
  }

  // Sign outside the DB try/catch so a signing failure never triggers the mock-user fallback.
  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    token: signToken(newUser.id),
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
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
    user = mockUser;
  }

  // Sign outside the DB try/catch so a signing failure never triggers the mock fallback.
  res.json({
    success: true,
    message: 'Login successful.',
    token: signToken(user.id),
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

  const otp = randomInt(100000, 1000000).toString();
  activeOtps.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

  try {
    // Send the real email via Nodemailer Google SMTP
    await sendOtpEmail(email, otp);
  } catch (err) {
    // Don't surface SMTP failures: an error only for existing accounts would reveal which emails exist.
    console.error('Failed to send OTP email:', (err as Error).message);
  }

  res.json({
    success: true,
    message: genericMessage,
    // Dev aid so the UI works without SMTP. Never returned in production.
    ...(process.env['NODE_ENV'] !== 'production' ? { simulatedOtp: otp } : {})
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
  res.json({ success: true, token: signToken(userId) });
});

// 4. Verify OTP & Reset Password (Unauthenticated OTP-based reset)
router.post('/reset-password-otp', resetLimiter, async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    return;
  }

  const entry = activeOtps.get(email);
  if (!entry || Date.now() > entry.expiresAt) {
    activeOtps.delete(email);
    res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    return;
  }
  if (!safeEqual(entry.otp, String(otp))) {
    entry.attempts += 1;
    if (entry.attempts >= OTP_MAX_ATTEMPTS) activeOtps.delete(email);
    res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    return;
  }

  try {
    const passwordHash = await hashPassword(String(newPassword));
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { email },
        data: { password: passwordHash }
      });
    } else {
      const mockUser = mockUsers.find(u => u.email === email);
      if (mockUser) mockUser.password = passwordHash;
    }

    activeOtps.delete(email);
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

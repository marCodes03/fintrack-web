import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { mockUsers, activeOtps, handleDbError } from '../mockStore';
import { sendOtpEmail } from '../services/email.service';

const router = Router();

// 1. Register
router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'All fields are required.' });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User with this email already exists.' });
      return;
    }

    const newUser = await prisma.user.create({
      data: { name, email, password }
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
  } catch (err) {
    // Fallback if database is offline
    const existing = mockUsers.find(u => u.email === email);
    if (existing) {
      res.status(400).json({ success: false, message: 'User with this email already exists.' });
      return;
    }
    const newUser = { id: `user-mock-${Date.now()}`, name, email, password };
    mockUsers.push(newUser);
    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
  }
});

// 2. Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    res.json({
      success: true,
      message: 'Login successful.',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }
    res.json({
      success: true,
      message: 'Login successful.',
      user: { id: user.id, name: user.name, email: user.email }
    });
  }
});

// 3. Forgot Password
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required.' });
    return;
  }

  // Check if user exists in Prisma DB or mock store
  let userExists = false;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) userExists = true;
  } catch (err) {
    const mockUser = mockUsers.find(u => u.email === email);
    if (mockUser) userExists = true;
  }

  if (!userExists) {
    res.status(404).json({ success: false, message: 'No account found with this email address.' });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  activeOtps.set(email, otp);

  try {
    // Send the real email via Nodemailer Google SMTP
    await sendOtpEmail(email, otp);

    res.json({
      success: true,
      message: `OTP sent to ${email}.`,
      simulatedOtp: otp // kept for development UI simulation
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email. Please try again later.',
      error: (err as Error).message
    });
  }
});

// 4. Verify OTP & Reset Password (Unauthenticated OTP-based reset)
router.post('/reset-password-otp', async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    return;
  }

  const storedOtp = activeOtps.get(email);
  if (!storedOtp || storedOtp !== otp) {
    res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { email },
        data: { password: newPassword }
      });
    } else {
      const mockUser = mockUsers.find(u => u.email === email);
      if (mockUser) mockUser.password = newPassword;
    }

    activeOtps.delete(email);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    handleDbError(err, res, 'Failed to reset password');
  }
});

// 5. Change Password (Authenticated reset using current password)
router.post('/reset-password', async (req: Request, res: Response) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword || !newPassword) {
    res.status(400).json({ success: false, message: 'Email, current password, and new password are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      if (user.password !== currentPassword) {
        res.status(400).json({ success: false, message: 'Incorrect current password.' });
        return;
      }
      await prisma.user.update({
        where: { email },
        data: { password: newPassword }
      });
    } else {
      const mockUser = mockUsers.find(u => u.email === email);
      if (!mockUser || mockUser.password !== currentPassword) {
        res.status(400).json({ success: false, message: 'Incorrect current password.' });
        return;
      }
      mockUser.password = newPassword;
    }

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    handleDbError(err, res, 'Failed to update password');
  }
});

export default router;


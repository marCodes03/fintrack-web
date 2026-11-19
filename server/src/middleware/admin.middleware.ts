import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { mockUsers } from '../mockStore';

/**
 * Restricts a route to admins. Admins are listed (comma-separated emails) in the
 * ADMIN_EMAILS environment variable. Must run after requireAuth.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const admins = (process.env['ADMIN_EMAILS'] || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  let email: string | undefined;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId as string } });
    email = user?.email;
  } catch {
    email = mockUsers.find(u => u.id === req.userId)?.email;
  }

  if (!email || !admins.includes(email.toLowerCase())) {
    res.status(403).json({ success: false, message: 'Admin access required.' });
    return;
  }
  next();
}

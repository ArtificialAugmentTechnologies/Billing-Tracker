import { loginSchema } from '@a2/shared';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { clearSessionCookie, requireAuth, setSessionCookie } from '../middleware/auth';

// Compared against when the email is unknown, so both failure cases take equally long.
const UNUSED_HASH = bcrypt.hashSync('unused', 12);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in 15 minutes.' },
});

export const authRouter = Router();

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    const matches = await bcrypt.compare(password, user?.passwordHash ?? UNUSED_HASH);
    if (!user || !matches) throw new HttpError(401, 'Incorrect email or password');

    setSessionCookie(res, user.id);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  }),
);

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

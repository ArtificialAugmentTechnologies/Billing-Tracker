import type { AuthUser, Role } from '@a2/shared';
import type { CookieOptions, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env';
import { asyncHandler, HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

const COOKIE_NAME = 'a2_session';
const SESSION_DAYS = 7;
const JWT_ALGORITHM = 'HS256';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
};

export function setSessionCookie(res: Response, userId: string) {
  const token = jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: `${SESSION_DAYS}d`,
    algorithm: JWT_ALGORITHM,
  });
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

function readSession(token: unknown) {
  if (typeof token !== 'string') return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    if (typeof payload !== 'object' || !payload.sub || !payload.iat) return null;
    return { userId: payload.sub, issuedAt: payload.iat };
  } catch {
    return null;
  }
}

/**
 * Loads the user on every request, so role changes and deleted users apply immediately, and a
 * changed password ends every session signed in before it.
 */
export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const session = readSession(req.cookies?.[COOKIE_NAME]);
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true, role: true, passwordChangedAt: true },
      })
    : null;

  if (!session || !user) throw new HttpError(401, 'Please sign in');

  const changedAt = user.passwordChangedAt?.getTime();
  if (changedAt && session.issuedAt < Math.floor(changedAt / 1000)) {
    throw new HttpError(401, 'Please sign in');
  }

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
});

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new HttpError(403, 'You do not have access to this'));
      return;
    }
    next();
  };
}

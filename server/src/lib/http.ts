import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Express 4 doesn't catch rejected promises, so async routes go through this. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

const PRISMA_ERRORS: Record<string, [status: number, message: string]> = {
  P2002: [409, 'That value is already in use'],
  P2003: [409, 'This record is linked to other records'],
  P2025: [404, 'Not found'],
};

// Express identifies error middleware by its four parameters.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request' });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && PRISMA_ERRORS[error.code]) {
    const [status, message] = PRISMA_ERRORS[error.code];
    res.status(status).json({ message });
    return;
  }
  console.error(error);
  res.status(500).json({ message: 'Something went wrong' });
};

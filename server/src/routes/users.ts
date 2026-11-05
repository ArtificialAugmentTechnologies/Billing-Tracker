import { newUserSchema, resetPasswordSchema, updateUserSchema, type UserRecord } from '@a2/shared';
import type { Prisma, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { audit } from '../lib/audit';
import { asyncHandler, HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';

const toRecord = (user: User): UserRecord => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
});

/** Locks the admins so two changes at once can't leave the app with none. */
async function assertAnotherAdmin(tx: Prisma.TransactionClient, userId: string) {
  const admins = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User" WHERE role = 'ADMIN' FOR UPDATE
  `;
  if (admins.length === 1 && admins[0].id === userId) {
    throw new HttpError(409, 'This is the only admin, so there must be another one first');
  }
}

export const usersRouter = Router();

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(users.map(toRecord));
  }),
);

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { password, ...data } = newUserSchema.parse(req.body);
    const user = await prisma.user.create({
      data: { ...data, passwordHash: await bcrypt.hash(password, 12) },
    });
    await audit(req.user?.id, 'User', user.id, 'CREATE');
    res.status(201).json(toRecord(user));
  }),
);

usersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const input = updateUserSchema.parse(req.body);

    const user = await prisma.$transaction(async (tx) => {
      if (input.role !== 'ADMIN') await assertAnotherAdmin(tx, id);
      return tx.user.update({ where: { id }, data: input });
    });

    await audit(req.user?.id, 'User', id, 'UPDATE');
    res.json(toRecord(user));
  }),
);

/** Sets a new password and ends that person's sessions. */
usersRouter.post(
  '/:id/password',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (id === req.user?.id) {
      throw new HttpError(409, 'Use the My password tab to change your own password');
    }

    const { password } = resetPasswordSchema.parse(req.body);
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 12), passwordChangedAt: new Date() },
    });
    await audit(req.user?.id, 'User', id, 'UPDATE');
    res.status(204).end();
  }),
);

usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (id === req.user?.id) throw new HttpError(409, "You can't delete your own account");

    await prisma.$transaction(async (tx) => {
      await assertAnotherAdmin(tx, id);
      await tx.user.delete({ where: { id } });
    });
    await audit(req.user?.id, 'User', id, 'DELETE');
    res.status(204).end();
  }),
);

import { catalogItemSchema, type CatalogItemRecord } from '@a2/shared';
import type { CatalogItem } from '@prisma/client';
import { Router } from 'express';
import { audit } from '../lib/audit';
import { asyncHandler } from '../lib/http';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/auth';

const toRecord = (item: CatalogItem): CatalogItemRecord => ({
  ...item,
  defaultRate: item.defaultRate.toNumber(),
});

export const catalogRouter = Router();

catalogRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.catalogItem.findMany({
      orderBy: [{ category: 'desc' }, { defaultRate: 'desc' }, { title: 'asc' }],
    });
    res.json(items.map(toRecord));
  }),
);

catalogRouter.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const item = await prisma.catalogItem.create({ data: catalogItemSchema.parse(req.body) });
    await audit(req.user?.id, 'CatalogItem', item.id, 'CREATE');
    res.status(201).json(toRecord(item));
  }),
);

catalogRouter.put(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const item = await prisma.catalogItem.update({
      where: { id: req.params.id },
      data: catalogItemSchema.parse(req.body),
    });
    await audit(req.user?.id, 'CatalogItem', item.id, 'UPDATE');
    res.json(toRecord(item));
  }),
);

/** Invoices keep their own copy of each line, so removing a catalogue item changes none of them. */
catalogRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.catalogItem.delete({ where: { id: req.params.id } });
    await audit(req.user?.id, 'CatalogItem', req.params.id, 'DELETE');
    res.status(204).end();
  }),
);

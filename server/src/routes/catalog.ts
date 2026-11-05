import type { CatalogItemRecord } from '@a2/shared';
import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { prisma } from '../lib/prisma';

export const catalogRouter = Router();

catalogRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.catalogItem.findMany({
      orderBy: [{ category: 'desc' }, { defaultRate: 'desc' }, { title: 'asc' }],
    });
    const records: CatalogItemRecord[] = items.map((item) => ({
      ...item,
      defaultRate: item.defaultRate.toNumber(),
    }));
    res.json(records);
  }),
);

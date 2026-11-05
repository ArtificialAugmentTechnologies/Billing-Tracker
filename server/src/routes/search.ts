import type { SearchResult } from '@a2/shared';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/http';
import { prisma } from '../lib/prisma';

const PER_KIND = 5;

export const searchRouter = Router();

searchRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = z
      .string()
      .trim()
      .max(100)
      .parse(req.query.q ?? '');
    if (q.length < 2) {
      res.json([]);
      return;
    }

    const contains = { contains: q, mode: 'insensitive' as const };
    const [clients, projects, invoices] = await Promise.all([
      prisma.client.findMany({
        where: { OR: [{ name: contains }, { alias: contains }] },
        select: { id: true, name: true, alias: true },
        take: PER_KIND,
        orderBy: { name: 'asc' },
      }),
      prisma.project.findMany({
        where: { OR: [{ name: contains }, { refCode: contains }] },
        select: { id: true, name: true, refCode: true },
        take: PER_KIND,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { OR: [{ invoiceNo: contains }, { client: { name: contains } }] },
        select: { id: true, invoiceNo: true, client: { select: { name: true } } },
        take: PER_KIND,
        orderBy: { invoiceDate: 'desc' },
      }),
    ]);

    const results: SearchResult[] = [
      ...clients.map((client) => ({
        kind: 'client' as const,
        id: client.id,
        title: client.name,
        subtitle: client.alias,
      })),
      ...projects.map((project) => ({
        kind: 'project' as const,
        id: project.id,
        title: project.name,
        subtitle: project.refCode,
      })),
      ...invoices.map((invoice) => ({
        kind: 'invoice' as const,
        id: invoice.id,
        title: invoice.invoiceNo,
        subtitle: invoice.client.name,
      })),
    ];
    res.json(results);
  }),
);

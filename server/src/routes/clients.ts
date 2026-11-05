import { CLIENT_SORTS, CLIENT_TYPES, clientSchema, type ClientSummary } from '@a2/shared';
import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../lib/audit';
import { asyncHandler, HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';
import {
  invoiceRowSelect,
  invoiceTotalsSelect,
  summarizeBilling,
  toInvoiceRow,
} from '../services/billing';
import { projectSummaryInclude, toProjectSummary } from '../services/projects';

const listQuery = z.object({
  search: z.string().trim().optional(),
  type: z.enum(CLIENT_TYPES).optional(),
  sort: z.enum(CLIENT_SORTS).default('name'),
});

const clientFields = {
  id: true,
  name: true,
  alias: true,
  type: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  pin: true,
  contactPerson: true,
  phone: true,
  email: true,
  gstin: true,
  notes: true,
} satisfies Prisma.ClientSelect;

export const clientsRouter = Router();

clientsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, type, sort } = listQuery.parse(req.query);

    const contains = search ? { contains: search, mode: 'insensitive' as const } : undefined;
    const clients = await prisma.client.findMany({
      where: {
        type,
        ...(contains && {
          OR: [
            { name: contains },
            { alias: contains },
            { contactPerson: contains },
            { email: contains },
            { city: contains },
          ],
        }),
      },
      orderBy: sort === 'recent' ? { createdAt: 'desc' } : { name: 'asc' },
      include: {
        invoices: { select: invoiceTotalsSelect },
        _count: { select: { projects: true } },
      },
    });

    const summaries: ClientSummary[] = clients.map((client) => ({
      id: client.id,
      name: client.name,
      alias: client.alias,
      type: client.type,
      city: client.city,
      contactPerson: client.contactPerson,
      phone: client.phone,
      email: client.email,
      projectCount: client._count.projects,
      ...summarizeBilling(client.invoices),
    }));

    if (sort === 'outstanding') summaries.sort((a, b) => b.outstanding - a.outstanding);
    res.json(summaries);
  }),
);

clientsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.create({ data, select: clientFields });
    await audit(req.user?.id, 'Client', client.id, 'CREATE');
    res.status(201).json(client);
  }),
);

clientsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      select: {
        ...clientFields,
        projects: { include: projectSummaryInclude, orderBy: { createdAt: 'desc' } },
        invoices: { select: invoiceRowSelect, orderBy: { invoiceDate: 'desc' } },
      },
    });
    if (!client) throw new HttpError(404, 'Client not found');

    res.json({
      ...client,
      ...summarizeBilling(client.invoices),
      projects: client.projects.map(toProjectSummary),
      invoices: client.invoices.map(toInvoiceRow),
    });
  }),
);

clientsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data,
      select: clientFields,
    });
    await audit(req.user?.id, 'Client', client.id, 'UPDATE');
    res.json(client);
  }),
);

clientsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [projects, invoices] = await Promise.all([
      prisma.project.count({ where: { clientId: id } }),
      prisma.invoice.count({ where: { clientId: id } }),
    ]);
    if (projects || invoices) {
      throw new HttpError(409, 'This client has projects or invoices, so it cannot be deleted');
    }

    await prisma.client.delete({ where: { id } });
    await audit(req.user?.id, 'Client', id, 'DELETE');
    res.status(204).end();
  }),
);

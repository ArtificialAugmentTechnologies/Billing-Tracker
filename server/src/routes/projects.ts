import {
  milestoneSchema,
  PROJECT_STATUSES,
  projectSchema,
  type MilestoneRecord,
  type ProjectPayload,
} from '@a2/shared';
import type { Milestone } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../lib/audit';
import { asyncHandler, HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { invoiceRowSelect, toDate, toDateString, toInvoiceRow } from '../services/billing';
import { projectSummaryInclude, toProjectSummary } from '../services/projects';

const listQuery = z.object({
  search: z.string().trim().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  clientId: z.string().optional(),
});

function toMilestoneRecord(milestone: Milestone): MilestoneRecord {
  return {
    id: milestone.id,
    name: milestone.name,
    plannedAmount: milestone.plannedAmount.toNumber(),
    dueDate: milestone.dueDate ? toDateString(milestone.dueDate) : null,
    status: milestone.status,
    order: milestone.order,
  };
}

const projectData = (input: ProjectPayload) => ({ ...input, startDate: toDate(input.startDate) });

export const projectsRouter = Router();

projectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, status, clientId } = listQuery.parse(req.query);

    const contains = search ? { contains: search, mode: 'insensitive' as const } : undefined;
    const projects = await prisma.project.findMany({
      where: {
        status,
        clientId,
        ...(contains && {
          OR: [{ name: contains }, { refCode: contains }, { client: { name: contains } }],
        }),
      },
      include: projectSummaryInclude,
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects.map(toProjectSummary));
  }),
);

projectsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = projectSchema.parse(req.body);
    const project = await prisma.project.create({ data: projectData(input) });
    await audit(req.user?.id, 'Project', project.id, 'CREATE');
    res.status(201).json({ id: project.id });
  }),
);

projectsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        ...projectSummaryInclude,
        milestones: { orderBy: { order: 'asc' } },
      },
    });
    if (!project) throw new HttpError(404, 'Project not found');

    const invoices = await prisma.invoice.findMany({
      where: { projectId: project.id },
      select: invoiceRowSelect,
      orderBy: { invoiceDate: 'desc' },
    });

    res.json({
      ...toProjectSummary(project),
      description: project.description,
      milestones: project.milestones.map(toMilestoneRecord),
      invoices: invoices.map(toInvoiceRow),
    });
  }),
);

projectsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const input = projectSchema.parse(req.body);

    const current = await prisma.project.findUnique({
      where: { id },
      select: { clientId: true, _count: { select: { invoices: true } } },
    });
    if (!current) throw new HttpError(404, 'Project not found');
    if (current.clientId !== input.clientId && current._count.invoices > 0) {
      throw new HttpError(409, 'This project has invoices, so its client cannot be changed');
    }

    await prisma.project.update({ where: { id }, data: projectData(input) });
    await audit(req.user?.id, 'Project', id, 'UPDATE');
    res.json({ id });
  }),
);

projectsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const invoices = await prisma.invoice.count({ where: { projectId: id } });
    if (invoices) throw new HttpError(409, 'This project has invoices, so it cannot be deleted');

    await prisma.project.delete({ where: { id } });
    await audit(req.user?.id, 'Project', id, 'DELETE');
    res.status(204).end();
  }),
);

projectsRouter.post(
  '/:id/milestones',
  asyncHandler(async (req, res) => {
    const projectId = req.params.id;
    const input = milestoneSchema.parse(req.body);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new HttpError(404, 'Project not found');

    const last = await prisma.milestone.aggregate({ where: { projectId }, _max: { order: true } });
    const milestone = await prisma.milestone.create({
      data: {
        ...input,
        projectId,
        dueDate: toDate(input.dueDate),
        order: (last._max.order ?? 0) + 1,
      },
    });
    await audit(req.user?.id, 'Milestone', milestone.id, 'CREATE');
    res.status(201).json(toMilestoneRecord(milestone));
  }),
);

export const milestonesRouter = Router();

milestonesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = milestoneSchema.parse(req.body);
    const milestone = await prisma.milestone.update({
      where: { id: req.params.id },
      data: { ...input, dueDate: toDate(input.dueDate) },
    });
    await audit(req.user?.id, 'Milestone', milestone.id, 'UPDATE');
    res.json(toMilestoneRecord(milestone));
  }),
);

milestonesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const invoices = await prisma.invoice.count({ where: { milestoneId: id } });
    if (invoices) throw new HttpError(409, 'This milestone has invoices, so it cannot be deleted');

    await prisma.milestone.delete({ where: { id } });
    await audit(req.user?.id, 'Milestone', id, 'DELETE');
    res.status(204).end();
  }),
);

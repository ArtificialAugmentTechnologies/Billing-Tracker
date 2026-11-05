import type { ProjectSummary } from '@a2/shared';
import type { Prisma } from '@prisma/client';
import { invoiceTotalsSelect, summarizeBilling, toDateString } from './billing';

export const projectSummaryInclude = {
  client: { select: { name: true } },
  invoices: { select: invoiceTotalsSelect },
  _count: { select: { milestones: true } },
} satisfies Prisma.ProjectInclude;

type ProjectSummaryData = Prisma.ProjectGetPayload<{ include: typeof projectSummaryInclude }>;

export function toProjectSummary(project: ProjectSummaryData): ProjectSummary {
  return {
    id: project.id,
    clientId: project.clientId,
    clientName: project.client.name,
    name: project.name,
    refCode: project.refCode,
    contractValue: project.contractValue.toNumber(),
    startDate: project.startDate ? toDateString(project.startDate) : null,
    status: project.status,
    milestoneCount: project._count.milestones,
    ...summarizeBilling(project.invoices),
  };
}

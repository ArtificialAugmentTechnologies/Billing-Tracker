import { addDays, calculateInvoice, type InvoicePayload } from '@a2/shared';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';

/** Drafts hold a temporary label, so a deleted draft never leaves a gap in the real numbers. */
export const draftInvoiceNo = () => `DRAFT-${randomUUID().slice(0, 8).toUpperCase()}`;

/** Today in India, whatever time zone the server runs in. */
export const todayInIndia = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

export async function assertLinksMatch(input: InvoicePayload) {
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) throw new HttpError(400, 'That client no longer exists');

  if (input.projectId) {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (project?.clientId !== input.clientId) {
      throw new HttpError(400, 'That project does not belong to this client');
    }
  }
  if (input.milestoneId) {
    const milestone = await prisma.milestone.findUnique({ where: { id: input.milestoneId } });
    if (!input.projectId || milestone?.projectId !== input.projectId) {
      throw new HttpError(400, 'That milestone does not belong to this project');
    }
  }
}

/** Turns validated input into rows. Totals always come from here, never from the client. */
export function toInvoiceRows(input: InvoicePayload) {
  const gstType = input.gstEnabled ? input.gstType : null;
  const gstRate = input.gstEnabled ? input.gstRate : null;
  const totals = calculateInvoice({
    items: input.items,
    discounts: input.discounts,
    tax: { enabled: input.gstEnabled, type: gstType, rate: gstRate },
    advances: input.advances.map((advance) => advance.amount),
  });

  const fields = {
    clientId: input.clientId,
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    subtitle: input.subtitle,
    invoiceDate: new Date(input.invoiceDate),
    dueDate: new Date(addDays(input.invoiceDate, input.paymentTermDays)),
    paymentTermDays: input.paymentTermDays,
    gstEnabled: input.gstEnabled,
    gstType,
    gstRate,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
    advanceTotal: totals.advanceTotal,
    balanceDue: totals.balanceDue,
    amountInWords: totals.amountInWords,
    terms: input.terms,
    notes: input.notes,
    ribbonText: input.ribbonText,
  };

  const items = input.items.map((item, index) => ({
    order: index + 1,
    title: item.title,
    subDescription: item.subDescription,
    qty: item.qty,
    rate: item.rate,
    discountType: item.discountType,
    discountValue: item.discountType ? item.discountValue : null,
    amount: totals.items[index].amount,
  }));

  const payments = input.advances.map((advance) => ({
    date: new Date(advance.date),
    amount: advance.amount,
    mode: advance.mode,
    reference: advance.reference,
    notes: 'Advance received',
    isAdvance: true,
  }));

  return { fields, items, discounts: totals.discounts, payments };
}

export const invoiceFormInclude = {
  items: { orderBy: { order: 'asc' } },
  discounts: true,
  payments: { where: { isAdvance: true }, orderBy: { date: 'asc' } },
} satisfies Prisma.InvoiceInclude;

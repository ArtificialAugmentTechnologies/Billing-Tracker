import { addDays, calculateInvoice, type InvoicePayload } from '@a2/shared';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { statusAfterPayment, toDateString } from './billing';
import { allocateInvoiceNo } from './invoice-number';

const { Decimal } = Prisma;

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

export const invoiceCopyInclude = {
  items: { orderBy: { order: 'asc' } },
  discounts: true,
  payments: { orderBy: { date: 'asc' } },
} satisfies Prisma.InvoiceInclude;

type InvoiceSource = Prisma.InvoiceGetPayload<{ include: typeof invoiceCopyInclude }>;

/** Creates a new draft dated today from an existing invoice, with its totals recalculated. */
export function createDraftCopy(
  source: InvoiceSource,
  options: { keepPayments?: boolean; notes?: string | null; revisionOfId?: string } = {},
) {
  const { fields, items, discounts, payments } = toInvoiceRows({
    clientId: source.clientId,
    projectId: source.projectId,
    milestoneId: source.milestoneId,
    subtitle: source.subtitle,
    invoiceDate: todayInIndia(),
    paymentTermDays: source.paymentTermDays,
    gstEnabled: source.gstEnabled,
    gstType: source.gstType,
    gstRate: source.gstRate?.toNumber() ?? null,
    items: source.items.map((item) => ({
      title: item.title,
      subDescription: item.subDescription,
      qty: item.qty.toNumber(),
      rate: item.rate.toNumber(),
      discountType: item.discountType,
      discountValue: item.discountValue?.toNumber() ?? null,
    })),
    discounts: source.discounts.map((discount) => ({
      label: discount.label,
      type: discount.type,
      value: discount.value.toNumber(),
    })),
    advances: options.keepPayments
      ? source.payments.map((payment) => ({
          amount: payment.amount.toNumber(),
          date: payment.date.toISOString().slice(0, 10),
          mode: payment.mode,
          reference: payment.reference,
        }))
      : [],
    terms: source.terms,
    notes: options.notes === undefined ? source.notes : options.notes,
    ribbonText: null,
  });

  return prisma.invoice.create({
    data: {
      ...fields,
      invoiceNo: draftInvoiceNo(),
      revisionOfId: options.revisionOfId,
      items: { create: items },
      discounts: { create: discounts },
      payments: { create: payments },
    },
  });
}

/**
 * Issues a draft: gives it its real number and locks it. If it's a revision, the invoice it
 * replaces is cancelled, and that invoice's payments stop counting because they were carried
 * onto the revision.
 */
export function finalizeInvoice(id: string) {
  return prisma.$transaction(
    async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: {
          payments: { select: { amount: true } },
          _count: { select: { items: true } },
        },
      });
      if (!invoice) throw new HttpError(404, 'Invoice not found');
      if (invoice.status !== 'DRAFT') throw new HttpError(409, 'This invoice is already finalized');
      if (invoice._count.items === 0) throw new HttpError(409, 'Add a line item before finalizing');

      const invoiceNo = await allocateInvoiceNo(tx, toDateString(invoice.invoiceDate));
      const paid = invoice.payments.reduce(
        (sum, payment) => sum.add(payment.amount),
        new Decimal(0),
      );

      // Two requests can both pass the check above. The number allocation makes the second one
      // wait, so by the time it gets here the status has changed and it rolls back.
      const { count } = await tx.invoice.updateMany({
        where: { id, status: 'DRAFT' },
        data: {
          invoiceNo,
          status: statusAfterPayment(invoice.total, paid),
          finalizedAt: new Date(),
        },
      });
      if (count === 0) throw new HttpError(409, 'This invoice is already finalized');

      if (invoice.revisionOfId) {
        await tx.invoice.update({
          where: { id: invoice.revisionOfId },
          data: { status: 'CANCELLED' },
        });
      }
      return invoiceNo;
    },
    { timeout: 15_000 },
  );
}

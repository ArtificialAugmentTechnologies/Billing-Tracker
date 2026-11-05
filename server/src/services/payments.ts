import {
  formatINR,
  receiptNumber,
  type InvoicePayments,
  type PaymentPayload,
  type PaymentRecord,
  type ReceiptDocument,
} from '@a2/shared';
import { Prisma, type Payment } from '@prisma/client';
import type { RequestHandler } from 'express';
import { asyncHandler, HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { statusAfterPayment, toDateString, todayInIndia } from './billing';
import { toClientBlock, toCompanyBlock } from './invoice-document';

const { Decimal } = Prisma;

const OVERDUE_SWEEP_MS = 60_000;
let lastSweep = 0;

/**
 * Nothing changes on the day an invoice falls overdue, so issued invoices are checked when the
 * data is next read, at most once a minute.
 */
export const refreshOverdue: RequestHandler = asyncHandler(async (_req, _res, next) => {
  if (Date.now() - lastSweep > OVERDUE_SWEEP_MS) {
    lastSweep = Date.now();
    await prisma.invoice.updateMany({
      where: {
        status: { in: ['SENT', 'PARTIALLY_PAID'] },
        dueDate: { lt: new Date(todayInIndia()) },
      },
      data: { status: 'OVERDUE' },
    });
  }
  next();
});

const sumOf = (payments: { amount: Prisma.Decimal }[]) =>
  payments.reduce((sum, payment) => sum.add(payment.amount), new Decimal(0));

export const toPaymentRecord = (payment: Payment): PaymentRecord => ({
  id: payment.id,
  receiptNo: receiptNumber(payment.id),
  date: toDateString(payment.date),
  amount: payment.amount.toNumber(),
  mode: payment.mode,
  reference: payment.reference,
  notes: payment.notes,
  isAdvance: payment.isAdvance,
});

function blockedReason(invoice: { status: string; revision: { status: string } | null }) {
  if (invoice.status === 'DRAFT') return 'Finalize the invoice before recording a payment';
  if (invoice.status === 'CANCELLED') return 'This invoice was cancelled';
  if (invoice.status === 'PAID') return 'This invoice is fully paid';
  // The revision copied this invoice's payments when it was started, so a new one would be lost.
  if (invoice.revision?.status === 'DRAFT') {
    return 'This invoice has a revision in progress. Finish or delete it first';
  }
  return null;
}

export async function loadInvoicePayments(id: string): Promise<InvoicePayments> {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      payments: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      revision: { select: { status: true } },
    },
  });
  if (!invoice) throw new HttpError(404, 'Invoice not found');

  const paid = sumOf(invoice.payments);
  return {
    status: invoice.status,
    total: invoice.total.toNumber(),
    paid: paid.toNumber(),
    balance: invoice.total.sub(paid).toNumber(),
    blockedReason: blockedReason(invoice),
    payments: invoice.payments.map(toPaymentRecord),
  };
}

/** Locks the invoice row, so two payments at once can't both fit the same balance. */
async function lockInvoice(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
  return tx.invoice.findUnique({
    where: { id },
    include: {
      payments: { select: { amount: true } },
      revision: { select: { status: true } },
    },
  });
}

export function recordPayment(invoiceId: string, input: PaymentPayload) {
  if (input.date > todayInIndia()) throw new HttpError(400, "A payment can't be in the future");

  return prisma.$transaction(async (tx) => {
    const invoice = await lockInvoice(tx, invoiceId);
    if (!invoice) throw new HttpError(404, 'Invoice not found');

    const reason = blockedReason(invoice);
    if (reason) throw new HttpError(409, reason);

    const paid = sumOf(invoice.payments);
    const balance = invoice.total.sub(paid);
    if (new Decimal(input.amount).greaterThan(balance)) {
      throw new HttpError(400, `That is more than the balance of ${formatINR(balance.toNumber())}`);
    }

    const payment = await tx.payment.create({
      data: { ...input, date: new Date(input.date), invoiceId },
    });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: statusAfterPayment(invoice.total, paid.add(input.amount), invoice.dueDate) },
    });
    return payment;
  });
}

export function deletePayment(id: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id } });
    if (!payment) throw new HttpError(404, 'Payment not found');

    const invoice = await lockInvoice(tx, payment.invoiceId);
    if (!invoice) throw new HttpError(404, 'Invoice not found');

    if (payment.isAdvance) {
      throw new HttpError(409, 'This advance is printed on the invoice, so it cannot be deleted');
    }
    if (invoice.status === 'CANCELLED') {
      throw new HttpError(409, 'This invoice was cancelled, so its payments cannot be changed');
    }
    if (invoice.revision?.status === 'DRAFT') {
      throw new HttpError(
        409,
        'This invoice has a revision in progress. Finish or delete it first',
      );
    }

    await tx.payment.delete({ where: { id } });
    const paid = sumOf(invoice.payments).sub(payment.amount);
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: statusAfterPayment(invoice.total, paid, invoice.dueDate) },
    });
  });
}

export async function loadReceiptDocument(paymentId: string): Promise<ReceiptDocument> {
  const [payment, company] = await Promise.all([
    prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            client: true,
            payments: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
          },
        },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!payment) throw new HttpError(404, 'Payment not found');
  if (!company) throw new Error('Company settings are missing. Run the database seed.');

  const { invoice } = payment;
  if (invoice.status === 'DRAFT') {
    throw new HttpError(409, 'Finalize the invoice before issuing a receipt');
  }

  // The balance as it stood after this payment, so old receipts don't change over time.
  const position = invoice.payments.findIndex((entry) => entry.id === payment.id);
  const paidToDate = sumOf(invoice.payments.slice(0, position + 1));

  return {
    company: toCompanyBlock(company),
    client: toClientBlock(invoice.client),
    receiptNo: receiptNumber(payment.id),
    date: toDateString(payment.date),
    amount: payment.amount.toNumber(),
    mode: payment.mode,
    reference: payment.reference,
    notes: payment.notes,
    invoiceNo: invoice.invoiceNo,
    invoiceDate: toDateString(invoice.invoiceDate),
    invoiceTotal: invoice.total.toNumber(),
    paidToDate: paidToDate.toNumber(),
    balanceAfter: invoice.total.sub(paidToDate).toNumber(),
  };
}

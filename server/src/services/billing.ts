import type { BillingTotals, InvoiceRow } from '@a2/shared';
import { Prisma, type InvoiceStatus } from '@prisma/client';

const NOT_BILLED: InvoiceStatus[] = ['DRAFT', 'CANCELLED'];

export const toDateString = (date: Date) => date.toISOString().slice(0, 10);
export const toDate = (date: string | null) => (date ? new Date(date) : null);

export const invoiceTotalsSelect = {
  status: true,
  total: true,
  payments: { select: { amount: true } },
} satisfies Prisma.InvoiceSelect;

export const invoiceRowSelect = {
  ...invoiceTotalsSelect,
  id: true,
  invoiceNo: true,
  invoiceDate: true,
  dueDate: true,
  project: { select: { name: true } },
} satisfies Prisma.InvoiceSelect;

type InvoiceTotals = Prisma.InvoiceGetPayload<{ select: typeof invoiceTotalsSelect }>;
type InvoiceRowData = Prisma.InvoiceGetPayload<{ select: typeof invoiceRowSelect }>;

const paidOn = (invoice: InvoiceTotals) =>
  invoice.payments.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));

/** Drafts and cancelled invoices don't count towards billed, received or outstanding. */
export function summarizeBilling(invoices: InvoiceTotals[]): BillingTotals {
  let billed = new Prisma.Decimal(0);
  let received = new Prisma.Decimal(0);

  for (const invoice of invoices) {
    if (NOT_BILLED.includes(invoice.status)) continue;
    billed = billed.add(invoice.total);
    received = received.add(paidOn(invoice));
  }

  return {
    billed: billed.toNumber(),
    received: received.toNumber(),
    outstanding: billed.sub(received).toNumber(),
  };
}

export function toInvoiceRow(invoice: InvoiceRowData): InvoiceRow {
  const paid = paidOn(invoice);
  return {
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    projectName: invoice.project?.name ?? null,
    invoiceDate: toDateString(invoice.invoiceDate),
    dueDate: toDateString(invoice.dueDate),
    total: invoice.total.toNumber(),
    paid: paid.toNumber(),
    balance: invoice.total.sub(paid).toNumber(),
    status: invoice.status,
  };
}

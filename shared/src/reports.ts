import { z } from 'zod';
import { INVOICE_STATUSES, type InvoiceRow, type InvoiceStatus } from './invoices';

const fyPattern = /^\d{4}-\d{2}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const INVOICE_SORTS = [
  'invoiceNo',
  'clientName',
  'projectName',
  'invoiceDate',
  'dueDate',
  'total',
  'paid',
  'balance',
  'status',
] as const;
export type InvoiceSort = (typeof INVOICE_SORTS)[number];

export const invoiceListQuery = z.object({
  search: z.string().trim().optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  clientId: z.string().optional(),
  from: z.string().regex(datePattern).optional(),
  to: z.string().regex(datePattern).optional(),
  fy: z.string().regex(fyPattern).optional(),
  sort: z.enum(INVOICE_SORTS).default('invoiceDate'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type InvoiceListQuery = z.input<typeof invoiceListQuery>;

export interface InvoiceListResponse {
  rows: InvoiceRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardData {
  kpis: {
    billed: number;
    received: number;
    outstanding: number;
    overdue: number;
    invoicesThisMonth: number;
  };
  /** The last 12 months, oldest first. */
  monthly: { month: string; label: string; billed: number; received: number }[];
  statusBreakdown: { status: InvoiceStatus; count: number; amount: number }[];
  draftCount: number;
  topClients: { id: string; name: string; billed: number }[];
  recent: InvoiceRow[];
  upcoming: InvoiceRow[];
  overdue: InvoiceRow[];
}

export interface OutstandingInvoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
  daysOverdue: number;
}

export interface ClientOutstanding {
  clientId: string;
  clientName: string;
  billed: number;
  paid: number;
  outstanding: number;
  overdue: number;
  invoices: OutstandingInvoice[];
}

export interface OutstandingReport {
  asOf: string;
  outstanding: number;
  overdue: number;
  clients: ClientOutstanding[];
}

export interface MonthlyRevenueReport {
  fy: string;
  months: {
    month: string;
    label: string;
    invoices: number;
    billed: number;
    tax: number;
    received: number;
  }[];
  totals: { invoices: number; billed: number; tax: number; received: number };
}

export interface FinancialYearRow {
  fy: string;
  invoices: number;
  billed: number;
  discount: number;
  tax: number;
  received: number;
  outstanding: number;
}

/** A compact rupee figure for chart axes, e.g. 25K, 1.5L or 2Cr. */
export function formatCompactINR(amount: number) {
  const trim = (value: number) => Number(value.toFixed(1)).toString();
  if (amount >= 10_000_000) return `${trim(amount / 10_000_000)}Cr`;
  if (amount >= 100_000) return `${trim(amount / 100_000)}L`;
  if (amount >= 1_000) return `${trim(amount / 1_000)}K`;
  return String(amount);
}

/** The first and last dates of a financial year such as 2026-27. */
export function financialYearRange(fy: string) {
  const startYear = Number(fy.slice(0, 4));
  return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` };
}

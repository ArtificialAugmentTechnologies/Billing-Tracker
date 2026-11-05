import {
  financialYear,
  financialYearRange,
  type ClientOutstanding,
  type DashboardData,
  type FinancialYearRow,
  type invoiceListQuery,
  type InvoiceRow,
  type MonthlyRevenueReport,
  type OutstandingReport,
} from '@a2/shared';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../lib/prisma';
import { invoiceRowSelect, toDateString, todayInIndia, toInvoiceRow } from './billing';

const { Decimal } = Prisma;

type ListFilters = z.output<typeof invoiceListQuery>;

const ISSUED: Prisma.InvoiceWhereInput = { status: { notIn: ['DRAFT', 'CANCELLED'] } };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthKey = (date: string | Date) =>
  (typeof date === 'string' ? date : toDateString(date)).slice(0, 7);

function monthLabel(key: string) {
  const [year, month] = key.split('-');
  return `${MONTHS[Number(month) - 1]} ${year.slice(2)}`;
}

/** The month keys ending at this one, oldest first. */
function lastMonths(endKey: string, count: number) {
  const [year, month] = endKey.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return monthKey(date);
  });
}

/** Sums money exactly, so totals don't pick up floating-point error. */
class Tally {
  private readonly totals = new Map<string, Prisma.Decimal>();

  add(key: string, amount: Prisma.Decimal | number) {
    this.totals.set(key, (this.totals.get(key) ?? new Decimal(0)).add(amount));
  }

  get(key: string) {
    return (this.totals.get(key) ?? new Decimal(0)).toNumber();
  }
}

function listWhere(filters: ListFilters): Prisma.InvoiceWhereInput {
  const contains = filters.search
    ? { contains: filters.search, mode: 'insensitive' as const }
    : undefined;
  const fyRange = filters.fy ? financialYearRange(filters.fy) : undefined;
  const from = [filters.from, fyRange?.from].filter(Boolean).sort().pop();
  const to = [filters.to, fyRange?.to].filter(Boolean).sort()[0];

  return {
    status: filters.status,
    clientId: filters.clientId,
    invoiceDate: {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    },
    ...(contains && {
      OR: [
        { invoiceNo: contains },
        { client: { name: contains } },
        { client: { alias: contains } },
        { project: { name: contains } },
      ],
    }),
  };
}

function compareRows(a: InvoiceRow, b: InvoiceRow, key: ListFilters['sort']) {
  const left = a[key] ?? '';
  const right = b[key] ?? '';
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), 'en-IN', { numeric: true });
}

/** Paid and balance come from payments, so sorting happens after the rows are built. */
export async function findInvoices(filters: ListFilters) {
  const invoices = await prisma.invoice.findMany({
    where: listWhere(filters),
    select: invoiceRowSelect,
  });
  const direction = filters.dir === 'asc' ? 1 : -1;
  return invoices
    .map(toInvoiceRow)
    .sort(
      (a, b) =>
        direction * compareRows(a, b, filters.sort) || b.invoiceNo.localeCompare(a.invoiceNo),
    );
}

export async function loadDashboard(): Promise<DashboardData> {
  const today = todayInIndia();
  const thisMonth = monthKey(today);
  const months = lastMonths(thisMonth, 12);

  const [invoices, draftCount] = await Promise.all([
    prisma.invoice.findMany({
      where: ISSUED,
      select: {
        ...invoiceRowSelect,
        clientId: true,
        createdAt: true,
        payments: { select: { amount: true, date: true } },
      },
      orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.invoice.count({ where: { status: 'DRAFT' } }),
  ]);

  const billedByMonth = new Tally();
  const receivedByMonth = new Tally();
  const billedByClient = new Tally();
  const amountByStatus = new Tally();
  const countByStatus = new Map<string, number>();
  const clientNames = new Map<string, string>();
  let billed = new Decimal(0);
  let received = new Decimal(0);
  let overdue = new Decimal(0);
  let invoicesThisMonth = 0;

  const rows = invoices.map((invoice) => {
    const row = toInvoiceRow(invoice);
    billed = billed.add(invoice.total);
    billedByMonth.add(monthKey(invoice.invoiceDate), invoice.total);
    billedByClient.add(invoice.clientId, invoice.total);
    clientNames.set(invoice.clientId, row.clientName);
    amountByStatus.add(invoice.status, invoice.total);
    countByStatus.set(invoice.status, (countByStatus.get(invoice.status) ?? 0) + 1);
    if (monthKey(invoice.invoiceDate) === thisMonth) invoicesThisMonth++;
    if (invoice.status === 'OVERDUE') overdue = overdue.add(row.balance);

    for (const payment of invoice.payments) {
      received = received.add(payment.amount);
      receivedByMonth.add(monthKey(payment.date), payment.amount);
    }
    return row;
  });

  const open = rows.filter((row) => row.balance > 0);

  return {
    kpis: {
      billed: billed.toNumber(),
      received: received.toNumber(),
      outstanding: billed.sub(received).toNumber(),
      overdue: overdue.toNumber(),
      invoicesThisMonth,
    },
    monthly: months.map((month) => ({
      month,
      label: monthLabel(month),
      billed: billedByMonth.get(month),
      received: receivedByMonth.get(month),
    })),
    statusBreakdown: (['PAID', 'PARTIALLY_PAID', 'SENT', 'OVERDUE'] as const).map((status) => ({
      status,
      count: countByStatus.get(status) ?? 0,
      amount: amountByStatus.get(status),
    })),
    draftCount,
    topClients: [...clientNames.entries()]
      .map(([id, name]) => ({ id, name, billed: billedByClient.get(id) }))
      .sort((a, b) => b.billed - a.billed)
      .slice(0, 5),
    recent: rows.slice(0, 5),
    upcoming: open
      .filter((row) => row.status !== 'OVERDUE' && row.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5),
    overdue: open
      .filter((row) => row.status === 'OVERDUE')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5),
  };
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export async function loadOutstanding(clientId?: string): Promise<OutstandingReport> {
  const asOf = todayInIndia();
  const invoices = await prisma.invoice.findMany({
    where: { ...ISSUED, clientId },
    select: { ...invoiceRowSelect, clientId: true },
    orderBy: { dueDate: 'asc' },
  });

  const clients = new Map<string, ClientOutstanding>();
  const totals = { outstanding: new Decimal(0), overdue: new Decimal(0) };

  for (const invoice of invoices) {
    const row = toInvoiceRow(invoice);
    if (row.balance <= 0) continue;

    const client: ClientOutstanding = clients.get(invoice.clientId) ?? {
      clientId: invoice.clientId,
      clientName: row.clientName,
      billed: 0,
      paid: 0,
      outstanding: 0,
      overdue: 0,
      invoices: [],
    };

    const isOverdue = row.status === 'OVERDUE';
    client.billed = new Decimal(client.billed).add(row.total).toNumber();
    client.paid = new Decimal(client.paid).add(row.paid).toNumber();
    client.outstanding = new Decimal(client.outstanding).add(row.balance).toNumber();
    if (isOverdue) client.overdue = new Decimal(client.overdue).add(row.balance).toNumber();
    client.invoices.push({
      id: row.id,
      invoiceNo: row.invoiceNo,
      invoiceDate: row.invoiceDate,
      dueDate: row.dueDate,
      total: row.total,
      paid: row.paid,
      balance: row.balance,
      status: row.status,
      daysOverdue: isOverdue ? daysBetween(row.dueDate, asOf) : 0,
    });
    clients.set(invoice.clientId, client);

    totals.outstanding = totals.outstanding.add(row.balance);
    if (isOverdue) totals.overdue = totals.overdue.add(row.balance);
  }

  return {
    asOf,
    outstanding: totals.outstanding.toNumber(),
    overdue: totals.overdue.toNumber(),
    clients: [...clients.values()].sort((a, b) => b.outstanding - a.outstanding),
  };
}

export async function loadMonthlyRevenue(fy: string): Promise<MonthlyRevenueReport> {
  const { from, to } = financialYearRange(fy);
  const range = { gte: new Date(from), lte: new Date(to) };

  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: { ...ISSUED, invoiceDate: range },
      select: { invoiceDate: true, total: true, taxTotal: true },
    }),
    prisma.payment.findMany({
      where: { date: range, invoice: ISSUED },
      select: { date: true, amount: true },
    }),
  ]);

  const billed = new Tally();
  const tax = new Tally();
  const received = new Tally();
  const counts = new Map<string, number>();

  for (const invoice of invoices) {
    const key = monthKey(invoice.invoiceDate);
    billed.add(key, invoice.total);
    tax.add(key, invoice.taxTotal);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    billed.add('all', invoice.total);
    tax.add('all', invoice.taxTotal);
  }
  for (const payment of payments) {
    received.add(monthKey(payment.date), payment.amount);
    received.add('all', payment.amount);
  }

  return {
    fy,
    months: lastMonths(monthKey(to), 12).map((month) => ({
      month,
      label: monthLabel(month),
      invoices: counts.get(month) ?? 0,
      billed: billed.get(month),
      tax: tax.get(month),
      received: received.get(month),
    })),
    totals: {
      invoices: invoices.length,
      billed: billed.get('all'),
      tax: tax.get('all'),
      received: received.get('all'),
    },
  };
}

export async function loadFinancialYears(): Promise<FinancialYearRow[]> {
  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: ISSUED,
      select: { invoiceDate: true, total: true, taxTotal: true, discountTotal: true },
    }),
    prisma.payment.findMany({
      where: { invoice: ISSUED },
      select: { amount: true, invoice: { select: { invoiceDate: true } } },
    }),
  ]);

  const years = new Set<string>([financialYear(todayInIndia())]);
  const billed = new Tally();
  const tax = new Tally();
  const discount = new Tally();
  const received = new Tally();
  const counts = new Map<string, number>();

  for (const invoice of invoices) {
    const fy = financialYear(toDateString(invoice.invoiceDate));
    years.add(fy);
    billed.add(fy, invoice.total);
    tax.add(fy, invoice.taxTotal);
    discount.add(fy, invoice.discountTotal);
    counts.set(fy, (counts.get(fy) ?? 0) + 1);
  }
  // Counted against the invoice's year, so outstanding shows what's left of that year's billing.
  for (const payment of payments) {
    received.add(financialYear(toDateString(payment.invoice.invoiceDate)), payment.amount);
  }

  return [...years]
    .sort()
    .reverse()
    .map((fy) => ({
      fy,
      invoices: counts.get(fy) ?? 0,
      billed: billed.get(fy),
      discount: discount.get(fy),
      tax: tax.get(fy),
      received: received.get(fy),
      outstanding: new Decimal(billed.get(fy)).sub(received.get(fy)).toNumber(),
    }));
}

import { financialYear, INVOICE_STATUS_LABELS, renderStatementHtml } from '@a2/shared';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../lib/http';
import { sendTable } from '../lib/export';
import { prisma } from '../lib/prisma';
import { renderPdf } from '../pdf/render';
import { todayInIndia } from '../services/billing';
import { toCompanyBlock } from '../services/invoice-document';
import {
  loadDashboard,
  loadFinancialYears,
  loadMonthlyRevenue,
  loadOutstanding,
} from '../services/reports';

const tableFormat = z.enum(['json', 'csv', 'xlsx']).default('json');

const outstandingQuery = z.object({
  clientId: z.string().optional(),
  format: z.enum(['json', 'csv', 'xlsx', 'pdf']).default('json'),
});

const monthlyQuery = z.object({
  fy: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  format: tableFormat,
});

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await loadDashboard());
  }),
);

export const reportsRouter = Router();

reportsRouter.get(
  '/outstanding',
  asyncHandler(async (req, res) => {
    const { clientId, format } = outstandingQuery.parse(req.query);
    const report = await loadOutstanding(clientId);

    if (format === 'json') {
      res.json(report);
      return;
    }

    if (format === 'pdf') {
      const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
      if (!company) throw new HttpError(500, 'Company settings are missing');
      const pdf = await renderPdf(renderStatementHtml(report, toCompanyBlock(company)));
      res
        .attachment(`outstanding-statement-${report.asOf}.pdf`)
        .type('application/pdf')
        .send(Buffer.from(pdf));
      return;
    }

    await sendTable(res, format, {
      filename: `outstanding-statement-${report.asOf}`,
      sheet: 'Outstanding',
      columns: [
        'Client',
        'Invoice no.',
        'Invoice date',
        'Due date',
        'Status',
        'Days overdue',
        'Total',
        'Paid',
        'Balance',
      ],
      rows: report.clients.flatMap((client) =>
        client.invoices.map((invoice) => [
          client.clientName,
          invoice.invoiceNo,
          invoice.invoiceDate,
          invoice.dueDate,
          INVOICE_STATUS_LABELS[invoice.status],
          invoice.daysOverdue,
          invoice.total,
          invoice.paid,
          invoice.balance,
        ]),
      ),
    });
  }),
);

reportsRouter.get(
  '/monthly',
  asyncHandler(async (req, res) => {
    const { fy = financialYear(todayInIndia()), format } = monthlyQuery.parse(req.query);
    const report = await loadMonthlyRevenue(fy);

    if (format === 'json') {
      res.json(report);
      return;
    }

    await sendTable(res, format, {
      filename: `monthly-revenue-${fy}`,
      sheet: `Revenue ${fy}`,
      columns: ['Month', 'Invoices', 'Billed', 'Tax', 'Received'],
      rows: [
        ...report.months.map((month) => [
          month.label,
          month.invoices,
          month.billed,
          month.tax,
          month.received,
        ]),
        [
          'Total',
          report.totals.invoices,
          report.totals.billed,
          report.totals.tax,
          report.totals.received,
        ],
      ],
    });
  }),
);

reportsRouter.get(
  '/fy-summary',
  asyncHandler(async (req, res) => {
    const format = tableFormat.parse(req.query.format);
    const years = await loadFinancialYears();

    if (format === 'json') {
      res.json(years);
      return;
    }

    await sendTable(res, format, {
      filename: 'financial-year-summary',
      sheet: 'FY summary',
      columns: [
        'Financial year',
        'Invoices',
        'Billed',
        'Discounts',
        'Tax',
        'Received',
        'Outstanding',
      ],
      rows: years.map((year) => [
        year.fy,
        year.invoices,
        year.billed,
        year.discount,
        year.tax,
        year.received,
        year.outstanding,
      ]),
    });
  }),
);

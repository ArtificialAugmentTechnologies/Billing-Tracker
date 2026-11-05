import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { prisma } from '../lib/prisma';
import { invoiceRowSelect, toInvoiceRow } from '../services/billing';
import { loadInvoiceDocument } from '../services/invoice-document';

export const invoicesRouter = Router();

invoicesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const invoices = await prisma.invoice.findMany({
      select: invoiceRowSelect,
      orderBy: [{ invoiceDate: 'desc' }, { invoiceNo: 'desc' }],
    });
    res.json(invoices.map(toInvoiceRow));
  }),
);

invoicesRouter.get(
  '/:id/document',
  asyncHandler(async (req, res) => {
    res.json(await loadInvoiceDocument(req.params.id));
  }),
);

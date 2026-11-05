import { PAYMENT_MODES, receiptNumber, renderReceiptHtml, type PaymentRow } from '@a2/shared';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../lib/audit';
import { asyncHandler } from '../lib/http';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/auth';
import { renderPdf } from '../pdf/render';
import { deletePayment, loadReceiptDocument, toPaymentRecord } from '../services/payments';

const listQuery = z.object({
  search: z.string().trim().optional(),
  mode: z.enum(PAYMENT_MODES).optional(),
});

export const paymentsRouter = Router();

paymentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, mode } = listQuery.parse(req.query);
    const contains = search ? { contains: search, mode: 'insensitive' as const } : undefined;

    // Drafts haven't been issued, and a cancelled invoice's payments moved to its revision.
    const payments = await prisma.payment.findMany({
      where: {
        mode,
        invoice: { status: { notIn: ['DRAFT', 'CANCELLED'] } },
        ...(contains && {
          OR: [
            { reference: contains },
            { invoice: { invoiceNo: contains } },
            { invoice: { client: { name: contains } } },
          ],
        }),
      },
      include: { invoice: { select: { invoiceNo: true, client: { select: { name: true } } } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    const rows: PaymentRow[] = payments.map((payment) => ({
      ...toPaymentRecord(payment),
      invoiceId: payment.invoiceId,
      invoiceNo: payment.invoice.invoiceNo,
      clientName: payment.invoice.client.name,
    }));
    res.json(rows);
  }),
);

paymentsRouter.get(
  '/:id/receipt',
  asyncHandler(async (req, res) => {
    const receipt = await loadReceiptDocument(req.params.id);
    const pdf = Buffer.from(await renderPdf(renderReceiptHtml(receipt)));
    res
      .attachment(`${receiptNumber(req.params.id)}.pdf`)
      .type('application/pdf')
      .send(pdf);
  }),
);

paymentsRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await deletePayment(req.params.id);
    await audit(req.user?.id, 'Payment', req.params.id, 'DELETE');
    res.status(204).end();
  }),
);

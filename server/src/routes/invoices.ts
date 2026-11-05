import {
  financialYear,
  invoiceSchema,
  nextInvoiceNumber,
  type InvoiceBuilderDefaults,
  type InvoiceRecord,
} from '@a2/shared';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../lib/audit';
import { asyncHandler, HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/auth';
import { invoiceRowSelect, toDateString, toInvoiceRow } from '../services/billing';
import { loadInvoiceDocument } from '../services/invoice-document';
import { getInvoicePdf } from '../services/invoice-pdf';
import {
  assertLinksMatch,
  createDraftCopy,
  draftInvoiceNo,
  finalizeInvoice,
  invoiceCopyInclude,
  invoiceFormInclude,
  toInvoiceRows,
} from '../services/invoices';

async function loadSettings() {
  const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });
  if (!settings) throw new Error('Company settings are missing. Run the database seed.');
  return settings;
}

async function loadDraft(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!invoice) throw new HttpError(404, 'Invoice not found');
  if (invoice.status !== 'DRAFT') {
    throw new HttpError(409, 'Only draft invoices can be changed');
  }
}

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
  '/builder-defaults',
  asyncHandler(async (_req, res) => {
    const settings = await loadSettings();
    const defaults: InvoiceBuilderDefaults = {
      company: {
        name: settings.name,
        addressLine: settings.addressLine,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        gstin: settings.gstin,
        bankAccountName: settings.bankAccountName,
        bankName: settings.bankName,
        bankAccountNo: settings.bankAccountNo,
        bankIfsc: settings.bankIfsc,
        upiId: settings.upiId,
        signatureUrl: settings.signatureUrl,
      },
      defaultTerms: settings.defaultTerms,
      defaultPaymentTermDays: settings.defaultPaymentTermDays,
      gstEnabledDefault: settings.gstEnabledDefault,
    };
    res.json(defaults);
  }),
);

/** The number an invoice dated this day would get. It is only assigned at finalize. */
invoicesRouter.get(
  '/next-number',
  asyncHandler(async (req, res) => {
    const date = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .parse(req.query.date);
    const settings = await loadSettings();
    const fy = financialYear(date);
    const earlier =
      fy < settings.currentFY
        ? await prisma.invoice.findMany({
            where: { invoiceNo: { startsWith: `${settings.invoicePrefix}/${fy}/` } },
            select: { invoiceNo: true },
          })
        : [];

    const { invoiceNo } = nextInvoiceNumber(
      settings,
      date,
      earlier.map((invoice) => invoice.invoiceNo),
    );
    res.json({ invoiceNo });
  }),
);

invoicesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = invoiceSchema.parse(req.body);
    await assertLinksMatch(input);

    const { fields, items, discounts, payments } = toInvoiceRows(input);
    const invoice = await prisma.invoice.create({
      data: {
        ...fields,
        invoiceNo: draftInvoiceNo(),
        items: { create: items },
        discounts: { create: discounts },
        payments: { create: payments },
      },
    });

    await audit(req.user?.id, 'Invoice', invoice.id, 'CREATE');
    res.status(201).json({ id: invoice.id });
  }),
);

invoicesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: invoiceFormInclude,
    });
    if (!invoice) throw new HttpError(404, 'Invoice not found');

    const record: InvoiceRecord = {
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      status: invoice.status,
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      milestoneId: invoice.milestoneId,
      subtitle: invoice.subtitle,
      invoiceDate: toDateString(invoice.invoiceDate),
      paymentTermDays: invoice.paymentTermDays,
      gstEnabled: invoice.gstEnabled,
      gstType: invoice.gstType,
      gstRate: invoice.gstRate?.toNumber() ?? null,
      items: invoice.items.map((item) => ({
        title: item.title,
        subDescription: item.subDescription,
        qty: item.qty.toNumber(),
        rate: item.rate.toNumber(),
        discountType: item.discountType,
        discountValue: item.discountValue?.toNumber() ?? null,
      })),
      discounts: invoice.discounts.map((discount) => ({
        label: discount.label,
        type: discount.type,
        value: discount.value.toNumber(),
      })),
      advances: invoice.payments.map((payment) => ({
        amount: payment.amount.toNumber(),
        date: toDateString(payment.date),
        mode: payment.mode,
        reference: payment.reference,
      })),
      terms: invoice.terms,
      notes: invoice.notes,
      ribbonText: invoice.ribbonText,
    };
    res.json(record);
  }),
);

invoicesRouter.get(
  '/:id/document',
  asyncHandler(async (req, res) => {
    res.json(await loadInvoiceDocument(req.params.id));
  }),
);

invoicesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await loadDraft(id);
    const input = invoiceSchema.parse(req.body);
    await assertLinksMatch(input);

    const { fields, items, discounts, payments } = toInvoiceRows(input);
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      prisma.invoiceDiscount.deleteMany({ where: { invoiceId: id } }),
      prisma.payment.deleteMany({ where: { invoiceId: id, isAdvance: true } }),
      prisma.invoice.update({
        where: { id },
        data: {
          ...fields,
          items: { create: items },
          discounts: { create: discounts },
          payments: { create: payments },
        },
      }),
    ]);

    await audit(req.user?.id, 'Invoice', id, 'UPDATE');
    res.json({ id });
  }),
);

/** Copies any invoice into a new draft dated today. Advances belong to the original. */
invoicesRouter.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const source = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: invoiceCopyInclude,
    });
    if (!source) throw new HttpError(404, 'Invoice not found');

    const copy = await createDraftCopy(source);
    await audit(req.user?.id, 'Invoice', copy.id, 'CREATE');
    res.status(201).json({ id: copy.id });
  }),
);

/**
 * Starts a replacement for a locked invoice. Everything is carried over, including what has been
 * paid. The original stays valid until the replacement is finalized.
 */
invoicesRouter.post(
  '/:id/revise',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const source = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { ...invoiceCopyInclude, revision: { select: { invoiceNo: true } } },
    });
    if (!source) throw new HttpError(404, 'Invoice not found');
    if (source.status === 'DRAFT') throw new HttpError(409, 'Drafts can simply be edited');
    if (source.status === 'CANCELLED') {
      throw new HttpError(409, 'A cancelled invoice cannot be revised');
    }
    if (source.revision) {
      throw new HttpError(409, `This invoice already has a revision: ${source.revision.invoiceNo}`);
    }

    const revisionNote = `Replaces invoice ${source.invoiceNo}.`;
    const copy = await createDraftCopy(source, {
      keepPayments: true,
      notes: [revisionNote, source.notes].filter(Boolean).join('\n'),
      revisionOfId: source.id,
    });
    await audit(req.user?.id, 'Invoice', copy.id, 'CREATE');
    res.status(201).json({ id: copy.id });
  }),
);

invoicesRouter.post(
  '/:id/finalize',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const invoiceNo = await finalizeInvoice(id);
    await audit(req.user?.id, 'Invoice', id, 'FINALIZE');

    // The invoice is issued even if the PDF fails now. It's made again on the next download.
    await getInvoicePdf(id).catch((error) => console.error('PDF generation failed', error));
    res.json({ id, invoiceNo });
  }),
);

invoicesRouter.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const { pdf, filename } = await getInvoicePdf(req.params.id);
    res.attachment(filename).type('application/pdf').send(pdf);
  }),
);

invoicesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await loadDraft(id);

    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.delete({ where: { id } }),
    ]);

    await audit(req.user?.id, 'Invoice', id, 'DELETE');
    res.status(204).end();
  }),
);

import {
  addDays,
  amountInWords,
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
import { invoiceRowSelect, toDateString, toInvoiceRow } from '../services/billing';
import { loadInvoiceDocument } from '../services/invoice-document';
import {
  assertLinksMatch,
  draftInvoiceNo,
  invoiceFormInclude,
  todayInIndia,
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
      include: { items: { orderBy: { order: 'asc' } }, discounts: true },
    });
    if (!source) throw new HttpError(404, 'Invoice not found');

    const invoiceDate = todayInIndia();
    const copy = await prisma.invoice.create({
      data: {
        invoiceNo: draftInvoiceNo(),
        clientId: source.clientId,
        projectId: source.projectId,
        milestoneId: source.milestoneId,
        subtitle: source.subtitle,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(addDays(invoiceDate, source.paymentTermDays)),
        paymentTermDays: source.paymentTermDays,
        gstEnabled: source.gstEnabled,
        gstType: source.gstType,
        gstRate: source.gstRate,
        subtotal: source.subtotal,
        discountTotal: source.discountTotal,
        taxTotal: source.taxTotal,
        total: source.total,
        advanceTotal: 0,
        balanceDue: source.total,
        amountInWords: amountInWords(source.total.toNumber()),
        terms: source.terms,
        notes: source.notes,
        items: {
          create: source.items.map((item) => ({
            order: item.order,
            title: item.title,
            subDescription: item.subDescription,
            qty: item.qty,
            rate: item.rate,
            discountType: item.discountType,
            discountValue: item.discountValue,
            amount: item.amount,
          })),
        },
        discounts: {
          create: source.discounts.map((discount) => ({
            label: discount.label,
            type: discount.type,
            value: discount.value,
            computedAmount: discount.computedAmount,
          })),
        },
      },
    });

    await audit(req.user?.id, 'Invoice', copy.id, 'CREATE');
    res.status(201).json({ id: copy.id });
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

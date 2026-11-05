import { calculateInvoice, type InvoiceDocument } from '@a2/shared';
import { HttpError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { toDateString } from './billing';

/** Loads an invoice as the template needs it. Totals come from the shared calculation. */
export async function loadInvoiceDocument(id: string): Promise<InvoiceDocument> {
  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
        items: { orderBy: { order: 'asc' } },
        discounts: true,
        payments: { where: { isAdvance: true }, orderBy: { date: 'asc' } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: 1 } }),
  ]);

  if (!invoice) throw new HttpError(404, 'Invoice not found');
  if (!company) throw new Error('Company settings are missing. Run the database seed.');

  const items = invoice.items.map((item) => ({
    title: item.title,
    subDescription: item.subDescription,
    qty: item.qty.toNumber(),
    rate: item.rate.toNumber(),
    discountType: item.discountType,
    discountValue: item.discountValue?.toNumber() ?? null,
  }));
  const discounts = invoice.discounts.map((discount) => ({
    label: discount.label,
    type: discount.type,
    value: discount.value.toNumber(),
  }));
  const advances = invoice.payments.map((payment) => ({
    label: 'Advance received',
    amount: payment.amount.toNumber(),
  }));
  const gstRate = invoice.gstRate?.toNumber() ?? null;

  return {
    company: {
      name: company.name,
      addressLine: company.addressLine,
      phone: company.phone,
      email: company.email,
      website: company.website,
      gstin: company.gstin,
      bankAccountName: company.bankAccountName,
      bankName: company.bankName,
      bankAccountNo: company.bankAccountNo,
      bankIfsc: company.bankIfsc,
      upiId: company.upiId,
      signatureUrl: company.signatureUrl,
    },
    client: {
      name: invoice.client.name,
      alias: invoice.client.alias,
      addressLine1: invoice.client.addressLine1,
      addressLine2: invoice.client.addressLine2,
      city: invoice.client.city,
      state: invoice.client.state,
      pin: invoice.client.pin,
      contactPerson: invoice.client.contactPerson,
      phone: invoice.client.phone,
      email: invoice.client.email,
      gstin: invoice.client.gstin,
    },
    project: invoice.project && {
      name: invoice.project.name,
      refCode: invoice.project.refCode,
      description: invoice.project.description,
    },
    invoiceNo: invoice.invoiceNo,
    subtitle: invoice.subtitle,
    invoiceDate: toDateString(invoice.invoiceDate),
    dueDate: toDateString(invoice.dueDate),
    paymentTermDays: invoice.paymentTermDays,
    gstEnabled: invoice.gstEnabled,
    gstType: invoice.gstType,
    gstRate,
    items,
    discounts,
    advances,
    terms: invoice.terms,
    notes: invoice.notes,
    ribbonText: invoice.ribbonText,
    totals: calculateInvoice({
      items,
      discounts,
      tax: { enabled: invoice.gstEnabled, type: invoice.gstType, rate: gstRate },
      advances: advances.map((advance) => advance.amount),
    }),
  };
}

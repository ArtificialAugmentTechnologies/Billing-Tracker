import { z } from 'zod';
import { DISCOUNT_TYPES, GST_TYPES } from './calc/totals';
import type { InvoiceDocument } from './invoice/document';
import { MAX_MONEY, money, optionalText } from './validation';

export const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_MODES = ['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  BANK_TRANSFER: 'Bank transfer',
  UPI: 'UPI',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
};

export const PAYMENT_TERM_OPTIONS = [7, 10, 15, 30] as const;
export const RIBBON_OPTIONS = ['DRAFT', 'SAMPLE', 'PAID'] as const;

export interface InvoiceRow {
  id: string;
  invoiceNo: string;
  clientName: string;
  projectName: string | null;
  invoiceDate: string;
  dueDate: string;
  total: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
}

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date');

const optionalId = z
  .string()
  .nullish()
  .transform((value) => value || null);

const discountType = z
  .enum(DISCOUNT_TYPES)
  .nullish()
  .transform((value) => value ?? null);

const discountValue = z.coerce
  .number({ invalid_type_error: 'Enter a value' })
  .min(0, 'Cannot be negative')
  .max(MAX_MONEY, 'Too large')
  .nullish()
  .transform((value) => value ?? null);

function checkPercent(
  discount: {
    discountType?: string | null;
    type?: string;
    discountValue?: number | null;
    value?: number;
  },
  ctx: z.RefinementCtx,
  path: string,
) {
  const type = discount.discountType ?? discount.type;
  const value = discount.discountValue ?? discount.value ?? 0;
  if (type === 'PERCENT' && value > 100) {
    ctx.addIssue({ code: 'custom', path: [path], message: 'Cannot be more than 100%' });
  }
}

const itemSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter a title').max(200),
    subDescription: optionalText(500),
    qty: z.coerce
      .number({ invalid_type_error: 'Enter a quantity' })
      .positive('Enter a quantity')
      .max(99_999_999, 'Too large')
      .transform((value) => Math.round(value * 100) / 100),
    rate: money,
    discountType,
    discountValue,
  })
  .superRefine((item, ctx) => checkPercent(item, ctx, 'discountValue'));

const discountSchema = z
  .object({
    label: z.string().trim().min(1, 'Enter a label').max(100),
    type: z.enum(DISCOUNT_TYPES),
    value: z.coerce
      .number({ invalid_type_error: 'Enter a value' })
      .min(0, 'Cannot be negative')
      .max(MAX_MONEY, 'Too large'),
  })
  .superRefine((discount, ctx) => checkPercent(discount, ctx, 'value'));

const advanceSchema = z.object({
  amount: money.refine((value) => value > 0, 'Enter an amount'),
  date: dateString,
  mode: z.enum(PAYMENT_MODES),
  reference: optionalText(100),
});

export const invoiceSchema = z
  .object({
    clientId: z.string().min(1, 'Choose a client'),
    projectId: optionalId,
    milestoneId: optionalId,
    subtitle: optionalText(200),
    invoiceDate: dateString,
    paymentTermDays: z.coerce
      .number({ invalid_type_error: 'Enter the number of days' })
      .int('Enter whole days')
      .min(0, 'Cannot be negative')
      .max(365, 'Keep this under a year'),
    gstEnabled: z.boolean(),
    gstType: z
      .enum(GST_TYPES)
      .nullish()
      .transform((value) => value ?? null),
    gstRate: z.coerce
      .number({ invalid_type_error: 'Enter a rate' })
      .min(0, 'Cannot be negative')
      .max(100, 'Cannot be more than 100%')
      .nullish()
      .transform((value) => value ?? null),
    items: z.array(itemSchema).min(1, 'Add at least one line item').max(200),
    discounts: z.array(discountSchema).max(20),
    advances: z.array(advanceSchema).max(50),
    terms: optionalText(2000),
    notes: optionalText(2000),
    ribbonText: optionalText(20),
  })
  .superRefine((invoice, ctx) => {
    if (invoice.gstEnabled && !invoice.gstType) {
      ctx.addIssue({ code: 'custom', path: ['gstType'], message: 'Choose the GST type' });
    }
  });
export type InvoiceInput = z.input<typeof invoiceSchema>;
export type InvoicePayload = z.output<typeof invoiceSchema>;

/** An invoice as the builder edits it. */
export type InvoiceRecord = InvoicePayload & {
  id: string;
  invoiceNo: string;
  status: InvoiceStatus;
};

export interface InvoiceBuilderDefaults {
  company: InvoiceDocument['company'];
  defaultTerms: string;
  defaultPaymentTermDays: number;
  gstEnabledDefault: boolean;
}

export interface CatalogItemRecord {
  id: string;
  title: string;
  subDescription: string | null;
  defaultRate: number;
  category: string | null;
}

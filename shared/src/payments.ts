import { z } from 'zod';
import { PAYMENT_MODES, type InvoiceStatus, type PaymentMode } from './invoices';
import { money, optionalText } from './validation';

export const paymentSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date'),
  amount: money.refine((value) => value > 0, 'Enter an amount'),
  mode: z.enum(PAYMENT_MODES),
  reference: optionalText(100),
  notes: optionalText(500),
});
export type PaymentInput = z.input<typeof paymentSchema>;
export type PaymentPayload = z.output<typeof paymentSchema>;

export interface PaymentRecord {
  id: string;
  receiptNo: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  reference: string | null;
  notes: string | null;
  isAdvance: boolean;
}

export interface PaymentRow extends PaymentRecord {
  invoiceId: string;
  invoiceNo: string;
  clientName: string;
}

export interface InvoicePayments {
  status: InvoiceStatus;
  total: number;
  paid: number;
  balance: number;
  /** Why a payment can't be recorded now, or null when it can. */
  blockedReason: string | null;
  payments: PaymentRecord[];
}

/** Payments are never renumbered, so a receipt keeps its number if another is deleted. */
export const receiptNumber = (paymentId: string) => `RCPT-${paymentId.slice(0, 8).toUpperCase()}`;

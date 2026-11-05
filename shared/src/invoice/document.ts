import type { DiscountType, GstType, InvoiceTotals } from '../calc/totals';

/** Everything the invoice template needs. Building one needs no database or browser. */
export interface InvoiceDocument {
  company: {
    name: string;
    addressLine: string;
    phone: string;
    email: string;
    website: string;
    gstin: string | null;
    bankAccountName: string | null;
    bankName: string | null;
    bankAccountNo: string | null;
    bankIfsc: string | null;
    upiId: string | null;
    signatureUrl: string | null;
  };
  client: {
    name: string;
    alias: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    pin: string | null;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    gstin: string | null;
  };
  project: { name: string; refCode: string; description: string | null } | null;
  invoiceNo: string;
  subtitle: string | null;
  invoiceDate: string;
  dueDate: string;
  paymentTermDays: number;
  gstEnabled: boolean;
  gstType: GstType | null;
  gstRate: number | null;
  items: {
    title: string;
    subDescription: string | null;
    qty: number;
    rate: number;
    discountType: DiscountType | null;
    discountValue: number | null;
  }[];
  discounts: { label: string; type: DiscountType; value: number }[];
  advances: { label: string; amount: number }[];
  terms: string | null;
  notes: string | null;
  ribbonText: string | null;
  totals: InvoiceTotals;
}

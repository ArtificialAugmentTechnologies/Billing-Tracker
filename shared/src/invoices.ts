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

export interface InvoiceRow {
  id: string;
  invoiceNo: string;
  projectName: string | null;
  invoiceDate: string;
  dueDate: string;
  total: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
}

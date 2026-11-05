import {
  addDays,
  calculateInvoice,
  type ClientRecord,
  type GstType,
  type InvoiceBuilderDefaults,
  type InvoiceDocument,
  type InvoiceInput,
  type ProjectDetail,
} from '@a2/shared';

export const todayLocal = () => new Date().toLocaleDateString('en-CA');

const toNumber = (value: unknown) => Number(value) || 0;

const validDate = (date: string | undefined) =>
  date && !Number.isNaN(Date.parse(date)) ? date : todayLocal();

const EMPTY_CLIENT: InvoiceDocument['client'] = {
  name: 'Choose a client',
  alias: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  pin: null,
  contactPerson: null,
  phone: null,
  email: null,
  gstin: null,
};

interface PreviewContext {
  company: InvoiceBuilderDefaults['company'];
  client?: ClientRecord;
  project?: ProjectDetail;
  invoiceNo: string;
}

/**
 * Turns half-filled form values into a document the template can always draw, so the preview
 * keeps working while someone is typing. Saving goes through validation on the server instead.
 */
export function buildPreviewDocument(
  values: InvoiceInput,
  { company, client, project, invoiceNo }: PreviewContext,
): InvoiceDocument {
  const items = (values.items ?? []).map((item) => ({
    title: item.title ?? '',
    subDescription: item.subDescription ?? null,
    qty: toNumber(item.qty),
    rate: toNumber(item.rate),
    discountType: item.discountType ?? null,
    discountValue: item.discountType ? toNumber(item.discountValue) : null,
  }));
  const discounts = (values.discounts ?? []).map((discount) => ({
    label: discount.label ?? '',
    type: discount.type,
    value: toNumber(discount.value),
  }));
  const advances = (values.advances ?? []).map((advance) => ({
    label: 'Advance received',
    amount: toNumber(advance.amount),
  }));

  const invoiceDate = validDate(values.invoiceDate);
  const paymentTermDays = Math.max(0, Math.floor(toNumber(values.paymentTermDays)));
  const gstEnabled = Boolean(values.gstEnabled);
  const gstType: GstType | null = gstEnabled ? (values.gstType ?? null) : null;
  const gstRate = gstEnabled ? toNumber(values.gstRate) : null;

  return {
    company,
    client: client ?? EMPTY_CLIENT,
    project: project
      ? { name: project.name, refCode: project.refCode, description: project.description }
      : null,
    invoiceNo,
    subtitle: values.subtitle || null,
    invoiceDate,
    dueDate: addDays(invoiceDate, paymentTermDays),
    paymentTermDays,
    gstEnabled,
    gstType,
    gstRate,
    items,
    discounts,
    advances,
    terms: values.terms || null,
    notes: values.notes || null,
    ribbonText: values.ribbonText || null,
    totals: calculateInvoice({
      items,
      discounts,
      tax: { enabled: gstEnabled, type: gstType, rate: gstRate },
      advances: advances.map((advance) => advance.amount),
    }),
  };
}

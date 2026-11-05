import { formatDate, formatINR } from '../format';
import type { InvoiceDocument } from './document';

/** A short message for the client, ready to paste into an email. */
export function invoiceEmailText(doc: InvoiceDocument) {
  const { client, company, project, totals } = doc;
  const subject = project ? `${doc.invoiceNo} · ${project.name}` : doc.invoiceNo;
  const greeting = client.contactPerson || client.name;

  return [
    `Subject: Invoice ${subject}`,
    '',
    `Dear ${greeting},`,
    '',
    `Please find attached invoice ${doc.invoiceNo} dated ${formatDate(doc.invoiceDate)}.`,
    '',
    `Invoice total: ${formatINR(totals.total)}`,
    `Balance due: ${formatINR(totals.balanceDue)}`,
    `Due date: ${formatDate(doc.dueDate)}`,
    '',
    'Please quote the invoice number with your payment.',
    '',
    'Thank you,',
    'A² Technologies',
    company.phone,
    company.email,
  ].join('\n');
}

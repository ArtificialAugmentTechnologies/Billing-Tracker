import { amountInWords } from '../calc/words';
import { formatDate, formatINR } from '../format';
import { PAYMENT_MODE_LABELS, type PaymentMode } from '../invoices';
import type { InvoiceDocument } from './document';
import { INVOICE_CSS, INVOICE_FONTS_URL } from './styles';
import { billedToLines, esc, renderBrand, renderSignature, row } from './template';

/** Everything a payment receipt prints. */
export interface ReceiptDocument {
  company: InvoiceDocument['company'];
  client: InvoiceDocument['client'];
  receiptNo: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  reference: string | null;
  notes: string | null;
  invoiceNo: string;
  invoiceDate: string;
  invoiceTotal: number;
  /** Paid on this invoice up to and including this payment. */
  paidToDate: number;
  balanceAfter: number;
}

export function renderReceiptHtml(doc: ReceiptDocument) {
  const { client, company } = doc;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(doc.receiptNo)}</title>
    <link href="${INVOICE_FONTS_URL}" rel="stylesheet" />
    <style>${INVOICE_CSS}</style>
  </head>
  <body>
    <div class="page">
      <header class="header">
        <div>${renderBrand(company)}</div>
        <div class="title">
          <p class="label">Payment received</p>
          <h1>RECEIPT</h1>
          <p class="subtitle">Against invoice ${esc(doc.invoiceNo)}</p>
        </div>
      </header>
      <div class="stripe"></div>
      <main class="body">
        <section class="parties">
          <div>
            <p class="label">Received from</p>
            <p class="billed-name">${esc(client.name)}${client.alias ? ` <span>(${esc(client.alias)})</span>` : ''}</p>
            <div class="billed-lines">
              ${billedToLines(client)
                .map((line) => `<div>${esc(line)}</div>`)
                .join('')}
            </div>
          </div>
          <div>
            <p class="label">Receipt details</p>
            <dl class="details">
              ${row('Receipt No.', esc(doc.receiptNo))}
              ${row('Date', esc(formatDate(doc.date)))}
              ${row('Payment Mode', esc(PAYMENT_MODE_LABELS[doc.mode]))}
              ${doc.reference ? row('Reference', esc(doc.reference)) : ''}
            </dl>
          </div>
        </section>

        <section class="receipt-amount">
          <p class="label">Amount received</p>
          <p class="receipt-figure">${formatINR(doc.amount)}</p>
          <p class="words">${esc(amountInWords(doc.amount))}</p>
        </section>

        <section class="summary">
          <div>
            <p class="label">Invoice</p>
            <dl class="details">
              ${row('Invoice No.', esc(doc.invoiceNo))}
              ${row('Invoice Date', esc(formatDate(doc.invoiceDate)))}
            </dl>
            ${doc.notes ? `<p class="note">${esc(doc.notes)}</p>` : ''}
          </div>
          <dl class="totals">
            ${row('Invoice total', formatINR(doc.invoiceTotal))}
            ${row('Paid to date', formatINR(-doc.paidToDate))}
            <div class="balance"><dt>Balance Due</dt><dd>${formatINR(doc.balanceAfter)}</dd></div>
          </dl>
        </section>
      </main>
      <div class="closing">
        <section class="footer">
          <div></div>
          <div></div>
          ${renderSignature(company)}
        </section>
        <footer class="thanks">
          <strong>Thank you for your payment!</strong>
          <span>${esc(company.website)}</span>
        </footer>
      </div>
    </div>
  </body>
</html>`;
}

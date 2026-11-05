import { formatAmount, formatDate, formatINR } from '../format';
import { INVOICE_STATUS_LABELS } from '../invoices';
import type { ClientOutstanding, OutstandingReport } from '../reports';
import type { InvoiceDocument } from './document';
import { INVOICE_CSS, INVOICE_FONTS_URL } from './styles';
import { esc, renderBrand, row } from './template';

function renderClient(client: ClientOutstanding) {
  const rows = client.invoices.map(
    (invoice) => `
      <tr>
        <td>${esc(invoice.invoiceNo)}</td>
        <td>${esc(formatDate(invoice.invoiceDate))}</td>
        <td>${esc(formatDate(invoice.dueDate))}</td>
        <td>${esc(INVOICE_STATUS_LABELS[invoice.status])}</td>
        <td class="right">${esc(formatAmount(invoice.total))}</td>
        <td class="right">${esc(formatAmount(invoice.paid))}</td>
        <td class="right">${esc(formatAmount(invoice.balance))}</td>
      </tr>
    `,
  );

  return `
    <section class="statement-client">
      <div class="statement-name">
        <strong>${esc(client.clientName)}</strong>
        <span>Outstanding ${formatINR(client.outstanding)}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Invoice No.</th>
            <th>Date</th>
            <th>Due</th>
            <th>Status</th>
            <th class="right">Total (₹)</th>
            <th class="right">Paid (₹)</th>
            <th class="right">Balance (₹)</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </section>
  `;
}

/** The outstanding statement, for every client or for one. */
export function renderStatementHtml(
  report: OutstandingReport,
  company: InvoiceDocument['company'],
) {
  const singleClient = report.clients.length === 1 ? report.clients[0] : null;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Outstanding statement</title>
    <link href="${INVOICE_FONTS_URL}" rel="stylesheet" />
    <style>${INVOICE_CSS}</style>
  </head>
  <body>
    <div class="page">
      <header class="header">
        <div>${renderBrand(company)}</div>
        <div class="title">
          <p class="label">Outstanding</p>
          <h1>STATEMENT</h1>
          <p class="subtitle">${singleClient ? esc(singleClient.clientName) : 'All clients'}</p>
        </div>
      </header>
      <div class="stripe"></div>
      <main class="body">
        <section class="summary">
          <div>
            <p class="label">Statement details</p>
            <dl class="details">
              ${row('As of', esc(formatDate(report.asOf)))}
              ${row('Clients', esc(report.clients.length))}
            </dl>
          </div>
          <dl class="totals">
            ${row('Overdue', formatINR(report.overdue))}
            <div class="balance"><dt>Outstanding</dt><dd>${formatINR(report.outstanding)}</dd></div>
          </dl>
        </section>
        ${
          report.clients.length
            ? report.clients.map(renderClient).join('')
            : '<p class="note">Nothing is outstanding.</p>'
        }
      </main>
      <div class="closing">
        <footer class="thanks">
          <strong>Please quote the invoice numbers with your payment.</strong>
          <span>${esc(company.website)}</span>
        </footer>
      </div>
    </div>
  </body>
</html>`;
}

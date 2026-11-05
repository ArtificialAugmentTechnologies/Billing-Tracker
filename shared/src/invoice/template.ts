import { formatAmount, formatDate, formatINR } from '../format';
import { logoMarkShapes } from '../logo';
import type { InvoiceDocument } from './document';
import { INVOICE_CSS, INVOICE_FONTS_URL } from './styles';

/** Everything printed from a record goes through this, as the text comes from users. */
function esc(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const isSafeImageUrl = (url: string) => /^(https?:\/\/|\/|data:image\/(png|jpeg|webp);)/i.test(url);

const twoDigits = (index: number) => String(index + 1).padStart(2, '0');

const formatQty = (qty: number) => qty.toLocaleString('en-IN', { maximumFractionDigits: 2 });

const row = (label: string, value: string) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;

const percentLabel = (rate: number) => `${rate.toLocaleString('en-IN')}%`;

function renderHeader(doc: InvoiceDocument) {
  const { company } = doc;
  return `
    <header class="header">
      <div>
        <div class="brand">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${logoMarkShapes('reversed')}</svg>
          <div>
            <div class="wordmark"><b>A</b><sup>2</sup> Technologies</div>
            <div class="tagline">Artificial Augment</div>
          </div>
        </div>
        <div class="company">
          <div><strong>${esc(company.name)}</strong> · ${esc(company.addressLine)}</div>
          <div>${esc(company.phone)} · ${esc(company.email)}</div>
          <div>${esc(company.website)}</div>
          ${company.gstin ? `<div>GSTIN: ${esc(company.gstin)}</div>` : ''}
        </div>
      </div>
      <div class="title">
        <p class="label">${doc.gstEnabled ? 'Tax invoice' : 'Tax not applicable'}</p>
        <h1>INVOICE</h1>
        ${doc.subtitle ? `<p class="subtitle">${esc(doc.subtitle)}</p>` : ''}
      </div>
    </header>
  `;
}

function renderParties(doc: InvoiceDocument) {
  const { client, project } = doc;
  const cityLine = [[client.city, client.state].filter(Boolean).join(', '), client.pin]
    .filter(Boolean)
    .join(' – ');
  const lines = [
    client.addressLine1,
    client.addressLine2,
    cityLine,
    [client.contactPerson, client.phone, client.email].filter(Boolean).join(' · '),
    client.gstin && `GSTIN: ${client.gstin}`,
  ].filter(Boolean);

  return `
    <section class="parties">
      <div>
        <p class="label">Billed to</p>
        <p class="billed-name">${esc(client.name)}${client.alias ? ` <span>(${esc(client.alias)})</span>` : ''}</p>
        <div class="billed-lines">${lines.map((line) => `<div>${esc(line)}</div>`).join('')}</div>
      </div>
      <div>
        <p class="label">Invoice details</p>
        <dl class="details">
          ${row('Invoice No.', esc(doc.invoiceNo))}
          ${row('Invoice Date', esc(formatDate(doc.invoiceDate)))}
          ${row('Due Date', esc(formatDate(doc.dueDate)))}
          ${project ? row('Project Ref.', esc(project.refCode)) : ''}
          ${row('Payment Terms', `Net ${esc(doc.paymentTermDays)} days`)}
        </dl>
      </div>
    </section>
  `;
}

function renderCallout(doc: InvoiceDocument) {
  if (!doc.project) return '';
  return `
    <section class="callout">
      <p><strong>${esc(doc.project.name)}</strong></p>
      ${doc.project.description ? `<p>${esc(doc.project.description)}</p>` : ''}
      ${doc.subtitle ? `<p>This invoice covers <strong>${esc(doc.subtitle)}</strong>.</p>` : ''}
    </section>
  `;
}

function renderItems(doc: InvoiceDocument) {
  const rows = doc.items.map((item, index) => {
    const line = doc.totals.items[index];
    const lineDiscount = line.discount > 0 ? `Less discount ${formatINR(line.discount)}` : '';
    const subLines = [item.subDescription, lineDiscount].filter(Boolean);

    return `
      <tr>
        <td class="num">${twoDigits(index)}</td>
        <td>
          <div class="item-title">${esc(item.title)}</div>
          ${subLines.map((text) => `<div class="item-sub">${esc(text)}</div>`).join('')}
        </td>
        <td class="right">${esc(formatQty(item.qty))}</td>
        <td class="right">${esc(formatAmount(item.rate))}</td>
        <td class="right">${esc(formatAmount(line.amount))}</td>
      </tr>
    `;
  });

  return `
    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Description</th>
          <th class="right qty">Qty</th>
          <th class="right money">Rate (₹)</th>
          <th class="right money">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

function taxNote(doc: InvoiceDocument) {
  if (!doc.gstEnabled) return 'GST is not applicable on this invoice.';
  const rate = doc.gstRate ?? 0;
  const applied =
    doc.gstType === 'IGST'
      ? `IGST at ${percentLabel(rate)}`
      : `CGST at ${percentLabel(rate / 2)} and SGST at ${percentLabel(rate / 2)}`;
  return `${applied} charged on ${formatINR(doc.totals.taxableAmount)}.`;
}

function renderTaxRows(doc: InvoiceDocument) {
  const { totals } = doc;
  if (!doc.gstEnabled) return '';
  const rate = doc.gstRate ?? 0;

  if (doc.gstType === 'IGST') return row(`IGST (${percentLabel(rate)})`, formatINR(totals.igst));
  return [
    row(`CGST (${percentLabel(rate / 2)})`, formatINR(totals.cgst)),
    row(`SGST (${percentLabel(rate / 2)})`, formatINR(totals.sgst)),
  ].join('');
}

function renderSummary(doc: InvoiceDocument) {
  const { totals } = doc;
  const discountRows = totals.discounts.map((discount) =>
    row(esc(discount.label), formatINR(-discount.computedAmount)),
  );
  const advanceRows = doc.advances.map((advance) =>
    row(esc(advance.label), formatINR(-advance.amount)),
  );

  return `
    <section class="summary">
      <div>
        <p class="label">Amount in words (balance due)</p>
        <p class="words">${esc(totals.amountInWords)}</p>
        <p class="note">${esc(taxNote(doc))}</p>
        ${doc.notes ? `<p class="note">${esc(doc.notes)}</p>` : ''}
      </div>
      <dl class="totals">
        ${row('Subtotal', formatINR(totals.subtotal))}
        ${discountRows.join('')}
        ${renderTaxRows(doc)}
        <div class="invoice-total"><dt>Invoice Total</dt><dd>${formatINR(totals.total)}</dd></div>
        ${advanceRows.join('')}
        <div class="balance"><dt>Balance Due</dt><dd>${formatINR(totals.balanceDue)}</dd></div>
      </dl>
    </section>
  `;
}

function renderFooter(doc: InvoiceDocument) {
  const { company } = doc;
  const bankRows = (
    [
      ['A/c name', company.bankAccountName],
      ['Bank', company.bankName],
      ['A/c no.', company.bankAccountNo],
      ['IFSC', company.bankIfsc],
      ['UPI ID', company.upiId],
    ] as const
  ).filter(([, value]) => value);

  const signature =
    company.signatureUrl && isSafeImageUrl(company.signatureUrl)
      ? `<img src="${esc(company.signatureUrl)}" alt="" />`
      : '';

  return `
    <section class="footer">
      <div>
        ${
          bankRows.length
            ? `<p class="label">Payment details</p>
               <dl class="bank">${bankRows.map(([label, value]) => row(label, esc(value))).join('')}</dl>`
            : ''
        }
      </div>
      <div>
        ${doc.terms ? `<p class="label">Terms</p><p class="terms">${esc(doc.terms)}</p>` : ''}
      </div>
      <div class="sign">
        <p class="label">For A² Technologies</p>
        <div class="sign-space">${signature}</div>
        <p class="sign-line">Authorised Signatory</p>
      </div>
    </section>
  `;
}

/** The page itself, without the surrounding document. The live preview swaps this as you type. */
export function renderInvoiceBody(doc: InvoiceDocument) {
  return `
    <div class="page${doc.ribbonText ? ' has-ribbon' : ''}">
      ${doc.ribbonText ? `<div class="ribbon">${esc(doc.ribbonText)}</div>` : ''}
      ${renderHeader(doc)}
      <div class="stripe"></div>
      <main class="body">
        ${renderParties(doc)}
        ${renderCallout(doc)}
        ${renderItems(doc)}
        ${renderSummary(doc)}
        ${renderFooter(doc)}
      </main>
      <footer class="thanks">
        <strong>Thank you for your business!</strong>
        <span>${esc(doc.company.website)}</span>
      </footer>
    </div>
  `;
}

/** A complete HTML page, used by both the on-screen preview and the PDF. */
export function renderInvoiceHtml(doc: InvoiceDocument | null) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(doc?.invoiceNo ?? 'Invoice')}</title>
    <link href="${INVOICE_FONTS_URL}" rel="stylesheet" />
    <style>${INVOICE_CSS}</style>
  </head>
  <body>${doc ? renderInvoiceBody(doc) : ''}</body>
</html>`;
}

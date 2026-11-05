import { BRAND } from '../brand';

export const INVOICE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap';

const { navy, orange, cream, greyOnLight, greyOnNavy } = BRAND;

export const INVOICE_CSS = `
@page { size: A4; margin: 0; }

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body { background: #fff; }

body {
  color: ${navy};
  font-family: Inter, system-ui, sans-serif;
  font-size: 9pt;
  line-height: 1.4;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 210mm;
  min-height: 297mm;
  overflow: hidden;
  background: #fff;
}

.label {
  color: ${orange};
  font-family: 'IBM Plex Mono', monospace;
  font-size: 7.5pt;
  font-weight: 500;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

/* Header band */
.header {
  display: flex;
  justify-content: space-between;
  gap: 8mm;
  padding: 8mm 12mm 7mm;
  background: ${navy};
  color: ${cream};
}
.brand { display: flex; align-items: center; gap: 3.5mm; }
.brand svg { width: 15mm; height: 15mm; flex: none; }
.wordmark {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 19pt;
  letter-spacing: -0.02em;
  line-height: 1;
}
.wordmark b { font-weight: 800; }
.wordmark sup {
  color: ${orange};
  font-size: 0.5em;
  font-weight: 800;
  line-height: 0;
  vertical-align: super;
}
.tagline {
  margin-top: 1.5mm;
  color: ${greyOnNavy};
  font-family: 'IBM Plex Mono', monospace;
  font-size: 6.5pt;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}
.company { margin-top: 3mm; color: ${greyOnNavy}; font-size: 8pt; line-height: 1.5; }
.company strong { color: ${cream}; font-weight: 600; }
.title { flex: none; max-width: 85mm; text-align: right; }
.title h1 {
  margin-top: 1.5mm;
  color: ${cream};
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 38pt;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1;
}
.subtitle { margin-top: 2mm; color: ${greyOnNavy}; font-size: 9.5pt; }

/* Status ribbon */
.ribbon {
  position: absolute;
  top: 7mm;
  right: -17mm;
  width: 60mm;
  padding: 1.2mm 0;
  background: ${orange};
  color: ${navy};
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8pt;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-align: center;
  text-transform: uppercase;
  transform: rotate(45deg);
}
.has-ribbon .title { padding-right: 12mm; }

.stripe { height: 1.5mm; background: ${orange}; }

/* Main content */
.body { display: flex; flex-direction: column; gap: 4mm; padding: 5.5mm 12mm 4mm; }

.parties { display: grid; grid-template-columns: 1fr 75mm; gap: 10mm; }
.billed-name { margin-top: 2mm; font-size: 11pt; font-weight: 700; }
.billed-name span { font-weight: 500; }
.billed-lines { margin-top: 1mm; color: ${greyOnLight}; }
.details { margin-top: 2mm; }
.details div { display: flex; justify-content: space-between; gap: 4mm; padding: 0.6mm 0; }
.details dt { color: ${greyOnLight}; }
.details dd { font-weight: 700; text-align: right; }

.callout {
  padding: 3mm 4mm;
  border-left: 1.2mm solid ${orange};
  background: ${cream};
}
.callout p + p { margin-top: 1mm; }

/* Line items */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
thead th {
  padding: 2mm 3mm;
  background: ${navy};
  /* Overlaps the next cell, as PDF viewers can show a hairline between touching fills. */
  box-shadow: 0.3mm 0 0 ${navy};
  color: ${cream};
  font-size: 8pt;
  font-weight: 600;
  text-align: left;
}
tbody tr { break-inside: avoid; }
tbody td { padding: 1.8mm 3mm; border-bottom: 0.25mm solid #E7E3DA; vertical-align: top; }
.num { width: 12mm; font-family: 'IBM Plex Mono', monospace; }
td.num { color: ${greyOnLight}; }
.right { text-align: right; white-space: nowrap; }
.qty { width: 14mm; }
.money { width: 32mm; }
.item-title { font-weight: 600; }
.item-sub { margin-top: 0.4mm; color: ${greyOnLight}; font-size: 8pt; }

/* Amount in words and totals */
.summary { display: grid; grid-template-columns: 1fr 72mm; gap: 8mm; break-inside: avoid; }
.words {
  margin-top: 2mm;
  padding: 2.5mm 3mm;
  background: ${cream};
  font-weight: 600;
}
.note { margin-top: 2mm; color: ${greyOnLight}; font-size: 8pt; white-space: pre-line; }

.totals div { display: flex; justify-content: space-between; gap: 4mm; padding: 0.7mm 3mm; }
.totals dt { color: ${greyOnLight}; }
.totals dd { font-weight: 600; white-space: nowrap; }
.totals .invoice-total {
  margin: 1mm 0;
  padding: 1.8mm 3mm;
  background: ${navy};
  color: ${cream};
  font-size: 10.5pt;
  font-weight: 700;
}
.totals .invoice-total dt { color: ${cream}; }
.totals .invoice-total dd { font-weight: 700; }
.totals .balance {
  margin-top: 1mm;
  padding: 1.8mm 3mm;
  border: 0.5mm solid ${orange};
  color: ${orange};
  font-size: 11.5pt;
  font-weight: 700;
}
.totals .balance dt { color: ${orange}; }
.totals .balance dd { font-weight: 700; }

/* Receipt amount */
.receipt-amount { padding: 5mm; border-left: 1.2mm solid ${orange}; background: ${cream}; }
.receipt-figure {
  margin-top: 2mm;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 30pt;
  font-weight: 800;
  line-height: 1.1;
}
.receipt-amount .words { margin-top: 1mm; padding: 0; background: none; }

/* Outstanding statement */
.statement-client { break-inside: avoid; }
.statement-name {
  display: flex;
  justify-content: space-between;
  gap: 4mm;
  margin-bottom: 1.5mm;
  font-size: 10pt;
}
.statement-name span { font-weight: 600; }

/* Footer columns and the closing bar stay together, at the bottom of the last page */
.closing { margin-top: auto; break-inside: avoid; }
.footer {
  display: grid;
  grid-template-columns: 1fr 1fr 48mm;
  gap: 7mm;
  margin: 0 12mm 4.5mm;
  padding-top: 3mm;
  border-top: 0.25mm solid #E7E3DA;
  font-size: 8pt;
}
.footer .label { margin-bottom: 1.5mm; }
.bank div { display: flex; gap: 2mm; }
.bank dt { flex: none; width: 15mm; color: ${greyOnLight}; }
.bank dd { min-width: 0; overflow-wrap: anywhere; }
.terms { color: ${greyOnLight}; white-space: pre-line; }
.sign { display: flex; flex-direction: column; }
.sign-space { display: flex; align-items: flex-end; height: 11mm; }
.sign-space img { max-width: 100%; max-height: 11mm; }
.sign-line { padding-top: 1mm; border-top: 0.25mm solid ${navy}; font-weight: 600; }

.thanks {
  display: flex;
  justify-content: space-between;
  gap: 8mm;
  padding: 3mm 12mm;
  background: ${navy};
  color: ${cream};
  font-size: 8.5pt;
}
.thanks strong { font-weight: 600; }
.thanks span { color: ${greyOnNavy}; }
`;

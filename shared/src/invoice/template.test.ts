import { describe, expect, it } from 'vitest';
import { calculateInvoice, type InvoiceCalcInput } from '../calc/totals';
import type { InvoiceDocument } from './document';
import { invoiceEmailText } from './email';
import { renderInvoiceBody, renderInvoiceHtml } from './template';

function makeDocument(overrides: Partial<InvoiceDocument> = {}): InvoiceDocument {
  const items = [
    {
      title: 'UI/UX Design',
      subDescription: 'Wireframes',
      qty: 1,
      rate: 8000,
      discountType: null,
      discountValue: null,
    },
    {
      title: 'Frontend Development (React)',
      subDescription: null,
      qty: 1,
      rate: 20000,
      discountType: null,
      discountValue: null,
    },
  ];
  const discounts = [{ label: 'Partner discount', type: 'FLAT' as const, value: 2000 }];
  const advances = [{ label: 'Advance received', amount: 10000 }];
  const gstEnabled = overrides.gstEnabled ?? false;
  const input: InvoiceCalcInput = {
    items: overrides.items ?? items,
    discounts: overrides.discounts ?? discounts,
    tax: { enabled: gstEnabled, type: overrides.gstType, rate: overrides.gstRate },
    advances: (overrides.advances ?? advances).map((advance) => advance.amount),
  };

  return {
    company: {
      name: 'Artificial Augment Technologies',
      addressLine: 'Bangalore | Salem',
      phone: '+91 93443 52823',
      email: 'admin@artificialaugmenttechnologies.com',
      website: 'www.artificialaugmenttechnologies.com',
      gstin: null,
      bankAccountName: 'A2',
      bankName: 'Bank',
      bankAccountNo: '123',
      bankIfsc: 'IFSC0001',
      upiId: null,
      signatureUrl: null,
    },
    client: {
      name: 'Agamathi Educationals',
      alias: 'Agamathikalvi',
      addressLine1: 'Line 1',
      addressLine2: null,
      city: 'Salem',
      state: 'Tamil Nadu',
      pin: '636001',
      contactPerson: 'Priya',
      phone: '+91 90000 00000',
      email: 'office@example.com',
      gstin: null,
    },
    project: { name: 'Website', refCode: 'AAT/PRJ/AGM-WEB', description: 'New website' },
    invoiceNo: 'AAT/INV/2026-27/001',
    subtitle: 'Milestone 1 · First Delivery',
    invoiceDate: '2026-10-27',
    dueDate: '2026-11-06',
    paymentTermDays: 10,
    gstEnabled,
    gstType: null,
    gstRate: null,
    items,
    discounts,
    advances,
    terms: '1. Pay on time.',
    notes: null,
    ribbonText: null,
    totals: calculateInvoice(input),
    ...overrides,
  };
}

describe('renderInvoiceBody', () => {
  const html = renderInvoiceBody(makeDocument());

  it('prints the invoice details', () => {
    expect(html).toContain('AAT/INV/2026-27/001');
    expect(html).toContain('27 Oct 2026');
    expect(html).toContain('06 Nov 2026');
    expect(html).toContain('AAT/PRJ/AGM-WEB');
    expect(html).toContain('Net 10 days');
    expect(html).toContain('Milestone 1 · First Delivery');
  });

  it('prints the client with the alias in brackets', () => {
    expect(html).toContain('Agamathi Educationals');
    expect(html).toContain('(Agamathikalvi)');
    expect(html).toContain('Priya · +91 90000 00000 · office@example.com');
  });

  it('numbers rows and shows amounts in Indian format', () => {
    expect(html).toContain('>01<');
    expect(html).toContain('>02<');
    expect(html).toContain('20,000.00');
  });

  it('shows discounts and advances as negative', () => {
    expect(html).toContain('Partner discount');
    expect(html).toContain('− ₹ 2,000.00');
    expect(html).toContain('− ₹ 10,000.00');
  });

  it('shows totals and the balance in words', () => {
    expect(html).toContain('₹ 26,000.00');
    expect(html).toContain('₹ 16,000.00');
    expect(html).toContain('Rupees Sixteen Thousand Only');
  });

  it('marks GST as not applicable by default', () => {
    expect(html).toContain('Tax not applicable');
    expect(html).toContain('GST is not applicable on this invoice.');
    expect(html).not.toContain('CGST');
  });

  it('skips empty bank fields', () => {
    expect(html).toContain('IFSC0001');
    expect(html).not.toContain('UPI ID');
  });

  it('hides the terms and payment headings when they have nothing under them', () => {
    const company = makeDocument().company;
    const bare = renderInvoiceBody(
      makeDocument({
        terms: null,
        company: {
          ...company,
          bankAccountName: null,
          bankName: null,
          bankAccountNo: null,
          bankIfsc: null,
          upiId: null,
        },
      }),
    );
    expect(bare).not.toContain('Payment details');
    expect(bare).not.toContain('>Terms<');
    expect(bare).toContain('Authorised Signatory');
  });

  it('has no ribbon unless one is set', () => {
    expect(html).not.toContain('class="ribbon"');
    expect(renderInvoiceBody(makeDocument({ ribbonText: 'DRAFT' }))).toContain(
      '<div class="ribbon">DRAFT</div>',
    );
  });

  it('leaves out the project callout and reference without a project', () => {
    const noProject = renderInvoiceBody(makeDocument({ project: null }));
    expect(noProject).not.toContain('class="callout"');
    expect(noProject).not.toContain('Project Ref.');
  });

  it('shows a line discount under the item', () => {
    const doc = makeDocument({
      items: [
        {
          title: 'Course',
          subDescription: null,
          qty: 1,
          rate: 1000,
          discountType: 'PERCENT',
          discountValue: 10,
        },
      ],
      discounts: [],
      advances: [],
    });
    expect(renderInvoiceBody(doc)).toContain('Less discount ₹ 100.00');
  });

  describe('with GST', () => {
    it('shows CGST and SGST for intra-state', () => {
      const body = renderInvoiceBody(
        makeDocument({ gstEnabled: true, gstType: 'CGST_SGST', gstRate: 18 }),
      );
      expect(body).toContain('Tax invoice');
      expect(body).toContain('CGST (9%)');
      expect(body).toContain('SGST (9%)');
      expect(body).toContain('₹ 2,340.00');
      expect(body).not.toContain('GST is not applicable');
    });

    it('shows IGST for inter-state', () => {
      const body = renderInvoiceBody(
        makeDocument({ gstEnabled: true, gstType: 'IGST', gstRate: 18 }),
      );
      expect(body).toContain('IGST (18%)');
      expect(body).toContain('₹ 4,680.00');
      expect(body).not.toContain('CGST');
    });
  });

  describe('safety', () => {
    it('escapes text from records', () => {
      const attack = '<img src=x onerror=alert(1)>';
      const body = renderInvoiceBody(
        makeDocument({
          client: { ...makeDocument().client, name: attack },
          notes: attack,
          terms: attack,
          ribbonText: attack,
          subtitle: attack,
        }),
      );
      expect(body).not.toContain('<img src=x');
      expect(body).toContain('&lt;img src=x');
    });

    it('escapes discount labels', () => {
      const doc = makeDocument({ discounts: [{ label: '<b>x</b>', type: 'FLAT', value: 1 }] });
      expect(renderInvoiceBody(doc)).toContain('&lt;b&gt;x&lt;/b&gt;');
    });

    it('allows only image addresses for the signature', () => {
      const company = makeDocument().company;
      const withUrl = (signatureUrl: string) =>
        renderInvoiceBody(makeDocument({ company: { ...company, signatureUrl } }));

      expect(withUrl('file:///etc/passwd')).not.toContain('<img');
      expect(withUrl('javascript:alert(1)')).not.toContain('<img');
      expect(withUrl('https://example.com/sign.png')).toContain('<img');
    });
  });
});

describe('invoiceEmailText', () => {
  it('gives the invoice number, amounts and due date', () => {
    const text = invoiceEmailText(makeDocument());
    expect(text).toContain('Subject: Invoice AAT/INV/2026-27/001 · Website');
    expect(text).toContain('Dear Priya,');
    expect(text).toContain('Invoice total: ₹ 26,000.00');
    expect(text).toContain('Balance due: ₹ 16,000.00');
    expect(text).toContain('Due date: 06 Nov 2026');
  });

  it('greets the client when there is no contact person', () => {
    const client = { ...makeDocument().client, contactPerson: null };
    expect(invoiceEmailText(makeDocument({ client }))).toContain('Dear Agamathi Educationals,');
  });
});

describe('renderInvoiceHtml', () => {
  it('is a complete document with the page styles', () => {
    const html = renderInvoiceHtml(makeDocument());
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('@page { size: A4; margin: 0; }');
    expect(html).toContain('<title>AAT/INV/2026-27/001</title>');
  });

  it('can be an empty page for the preview to fill in', () => {
    expect(renderInvoiceHtml(null)).toContain('<body></body>');
  });
});

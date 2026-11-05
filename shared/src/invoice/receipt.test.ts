import { describe, expect, it } from 'vitest';
import { paymentSchema, receiptNumber } from '../payments';
import { renderReceiptHtml, type ReceiptDocument } from './receipt';

const receipt: ReceiptDocument = {
  company: {
    name: 'Artificial Augment Technologies',
    addressLine: 'Bangalore | Salem',
    phone: '+91 93443 52823',
    email: 'admin@artificialaugmenttechnologies.com',
    website: 'www.artificialaugmenttechnologies.com',
    gstin: null,
    bankAccountName: null,
    bankName: null,
    bankAccountNo: null,
    bankIfsc: null,
    upiId: null,
    signatureUrl: null,
  },
  client: {
    name: 'Agamathi Educationals',
    alias: 'Agamathikalvi',
    addressLine1: null,
    addressLine2: null,
    city: 'Salem',
    state: null,
    pin: null,
    contactPerson: null,
    phone: null,
    email: null,
    gstin: null,
  },
  receiptNo: 'RCPT-1A2B3C4D',
  date: '2026-11-05',
  amount: 16000,
  mode: 'UPI',
  reference: 'UTR123',
  notes: null,
  invoiceNo: 'AAT/INV/2026-27/001',
  invoiceDate: '2026-10-27',
  invoiceTotal: 26000,
  paidToDate: 26000,
  balanceAfter: 0,
};

describe('renderReceiptHtml', () => {
  const html = renderReceiptHtml(receipt);

  it('shows what was received and from whom', () => {
    expect(html).toContain('RECEIPT');
    expect(html).toContain('RCPT-1A2B3C4D');
    expect(html).toContain('Agamathi Educationals');
    expect(html).toContain('(Agamathikalvi)');
    expect(html).toContain('₹ 16,000.00');
    expect(html).toContain('Rupees Sixteen Thousand Only');
    expect(html).toContain('05 Nov 2026');
  });

  it('shows the mode and reference', () => {
    expect(html).toContain('UPI');
    expect(html).toContain('UTR123');
  });

  it('leaves out an empty reference', () => {
    expect(renderReceiptHtml({ ...receipt, reference: null })).not.toContain('Reference');
  });

  it('shows where the invoice stands', () => {
    expect(html).toContain('AAT/INV/2026-27/001');
    expect(html).toContain('₹ 26,000.00');
    expect(html).toContain('− ₹ 26,000.00');
    expect(html).toContain('₹ 0.00');
  });

  it('escapes text from records', () => {
    const attack = '<img src=x onerror=alert(1)>';
    const body = renderReceiptHtml({ ...receipt, reference: attack, notes: attack });
    expect(body).not.toContain('<img src=x');
  });
});

describe('receiptNumber', () => {
  it('is short and stable', () => {
    expect(receiptNumber('1a2b3c4d-0000-4000-8000-000000000000')).toBe('RCPT-1A2B3C4D');
  });
});

describe('paymentSchema', () => {
  const valid = { date: '2026-11-05', amount: 500, mode: 'CASH' };

  it('accepts a payment and turns blanks into null', () => {
    expect(paymentSchema.parse({ ...valid, amount: '500.50', reference: '' })).toMatchObject({
      amount: 500.5,
      reference: null,
    });
  });

  it.each([
    ['zero', { amount: 0 }],
    ['a negative amount', { amount: -1 }],
    ['a bad date', { date: '2026-02-40' }],
    ['an unknown mode', { mode: 'BITCOIN' }],
  ])('rejects %s', (_name, change) => {
    expect(paymentSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});

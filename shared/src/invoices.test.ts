import { describe, expect, it } from 'vitest';
import { invoiceSchema, type InvoiceInput } from './invoices';

const valid: InvoiceInput = {
  clientId: 'client-1',
  invoiceDate: '2026-11-05',
  paymentTermDays: 10,
  gstEnabled: false,
  items: [{ title: 'Workshop fee', qty: 1, rate: 5000 }],
  discounts: [],
  advances: [],
};

const messages = (input: unknown) => {
  const result = invoiceSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('invoiceSchema', () => {
  it('accepts a minimal invoice', () => {
    expect(messages(valid)).toEqual([]);
  });

  it('turns form text into numbers and blanks into null', () => {
    const parsed = invoiceSchema.parse({
      ...valid,
      paymentTermDays: '15',
      projectId: '',
      notes: '  ',
      items: [{ title: ' Fee ', subDescription: '', qty: '2.5', rate: '1000.50' }],
    });
    expect(parsed.paymentTermDays).toBe(15);
    expect(parsed.projectId).toBeNull();
    expect(parsed.notes).toBeNull();
    expect(parsed.items[0]).toMatchObject({
      title: 'Fee',
      subDescription: null,
      qty: 2.5,
      rate: 1000.5,
    });
  });

  it.each([
    ['no client', { clientId: '' }, 'Choose a client'],
    ['no items', { items: [] }, 'Add at least one line item'],
    ['an impossible date', { invoiceDate: '2026-13-45' }, 'Enter a valid date'],
    ['a blank date', { invoiceDate: '' }, 'Enter a date'],
    ['negative terms', { paymentTermDays: -1 }, 'Cannot be negative'],
    ['part days', { paymentTermDays: 1.5 }, 'Enter whole days'],
    ['GST with no type', { gstEnabled: true }, 'Choose the GST type'],
    ['a GST rate over 100', { gstRate: 101 }, 'Cannot be more than 100%'],
  ])('rejects %s', (_name, change, message) => {
    expect(messages({ ...valid, ...change })).toContain(message);
  });

  it.each([
    ['a blank title', { title: ' ', qty: 1, rate: 1 }, 'Enter a title'],
    ['zero quantity', { title: 'A', qty: 0, rate: 1 }, 'Enter a quantity'],
    ['a negative rate', { title: 'A', qty: 1, rate: -1 }, 'Amount cannot be negative'],
    [
      'a line discount over 100%',
      { title: 'A', qty: 1, rate: 1, discountType: 'PERCENT', discountValue: 101 },
      'Cannot be more than 100%',
    ],
  ])('rejects a line item with %s', (_name, item, message) => {
    expect(messages({ ...valid, items: [item] })).toContain(message);
  });

  it('allows a flat discount above 100, but not a percentage', () => {
    const discount = (type: string) => ({ label: 'A', type, value: 500 });
    expect(messages({ ...valid, discounts: [discount('FLAT')] })).toEqual([]);
    expect(messages({ ...valid, discounts: [discount('PERCENT')] })).toContain(
      'Cannot be more than 100%',
    );
  });

  it('needs a label on every discount', () => {
    expect(messages({ ...valid, discounts: [{ label: '', type: 'FLAT', value: 1 }] })).toContain(
      'Enter a label',
    );
  });

  it('needs an amount on every advance', () => {
    const advance = { amount: 0, date: '2026-11-05', mode: 'UPI' };
    expect(messages({ ...valid, advances: [advance] })).toContain('Enter an amount');
  });
});

import { describe, expect, it } from 'vitest';
import { calculateInvoice } from './totals';

const oneItem = (rate: number) => [{ qty: 1, rate }];

describe('calculateInvoice', () => {
  it('reproduces the sample invoice', () => {
    const result = calculateInvoice({
      items: [
        { qty: 1, rate: 8000 },
        { qty: 1, rate: 12000 },
        { qty: 1, rate: 6000 },
        { qty: 1, rate: 2000 },
      ],
      discounts: [{ label: 'Partner discount', type: 'FLAT', value: 2000 }],
      tax: { enabled: false },
      advances: [10000],
    });

    expect(result).toMatchObject({
      subtotal: 28000,
      discountTotal: 2000,
      taxTotal: 0,
      total: 26000,
      advanceTotal: 10000,
      balanceDue: 16000,
      amountInWords: 'Rupees Sixteen Thousand Only',
    });
  });

  it('handles an empty invoice', () => {
    expect(calculateInvoice({ items: [] })).toMatchObject({
      subtotal: 0,
      total: 0,
      balanceDue: 0,
      amountInWords: 'Rupees Zero Only',
    });
  });

  it('multiplies quantity and rate, rounding to the paisa', () => {
    const result = calculateInvoice({ items: [{ qty: 2.5, rate: 333.33 }] });
    expect(result.items[0].amount).toBe(833.33);
  });

  it('adds decimal amounts without floating-point error', () => {
    const result = calculateInvoice({ items: [...oneItem(0.1), ...oneItem(0.2)] });
    expect(result.subtotal).toBe(0.3);
  });

  it('stays exact at the largest amount', () => {
    const result = calculateInvoice({ items: oneItem(9_999_999_999.99) });
    expect(result.total).toBe(9_999_999_999.99);
  });

  describe('invoice discounts', () => {
    it('applies a percentage to the subtotal', () => {
      const result = calculateInvoice({
        items: oneItem(10000),
        discounts: [{ label: 'Student', type: 'PERCENT', value: 12.5 }],
      });
      expect(result.discounts[0].computedAmount).toBe(1250);
      expect(result.total).toBe(8750);
    });

    it('works out several discounts on the subtotal, not on each other', () => {
      const result = calculateInvoice({
        items: oneItem(10000),
        discounts: [
          { label: 'Early-bird', type: 'PERCENT', value: 10 },
          { label: 'Partner', type: 'PERCENT', value: 10 },
          { label: 'Goodwill', type: 'FLAT', value: 500 },
        ],
      });
      expect(result.discounts.map((d) => d.computedAmount)).toEqual([1000, 1000, 500]);
      expect(result.discountTotal).toBe(2500);
      expect(result.total).toBe(7500);
    });

    it('keeps each discount label and type', () => {
      const result = calculateInvoice({
        items: oneItem(1000),
        discounts: [{ label: 'Partner discount', type: 'FLAT', value: 100 }],
      });
      expect(result.discounts[0]).toEqual({
        label: 'Partner discount',
        type: 'FLAT',
        value: 100,
        computedAmount: 100,
      });
    });

    it('never discounts below zero', () => {
      const result = calculateInvoice({
        items: oneItem(1000),
        discounts: [
          { label: 'A', type: 'FLAT', value: 700 },
          { label: 'B', type: 'FLAT', value: 700 },
        ],
      });
      expect(result.discounts.map((d) => d.computedAmount)).toEqual([700, 300]);
      expect(result.total).toBe(0);
    });
  });

  describe('line discounts', () => {
    it('reduces the line amount and the subtotal', () => {
      const result = calculateInvoice({
        items: [
          { qty: 2, rate: 1000, discountType: 'PERCENT', discountValue: 10 },
          { qty: 1, rate: 500, discountType: 'FLAT', discountValue: 100 },
        ],
      });
      expect(result.items).toEqual([
        { gross: 2000, discount: 200, amount: 1800 },
        { gross: 500, discount: 100, amount: 400 },
      ]);
      expect(result.subtotal).toBe(2200);
    });

    it('never exceeds the line amount', () => {
      const result = calculateInvoice({
        items: [{ qty: 1, rate: 100, discountType: 'FLAT', discountValue: 500 }],
      });
      expect(result.items[0].amount).toBe(0);
    });

    it('applies invoice discounts after line discounts', () => {
      const result = calculateInvoice({
        items: [{ qty: 1, rate: 1000, discountType: 'PERCENT', discountValue: 10 }],
        discounts: [{ label: 'A', type: 'PERCENT', value: 10 }],
      });
      expect(result.discountTotal).toBe(90);
      expect(result.total).toBe(810);
    });
  });

  describe('GST', () => {
    it('adds nothing when switched off', () => {
      const result = calculateInvoice({
        items: oneItem(1000),
        tax: { enabled: false, type: 'IGST', rate: 18 },
      });
      expect(result.taxTotal).toBe(0);
      expect(result.total).toBe(1000);
    });

    it('splits intra-state tax into equal CGST and SGST', () => {
      const result = calculateInvoice({
        items: oneItem(10000),
        tax: { enabled: true, type: 'CGST_SGST', rate: 18 },
      });
      expect(result).toMatchObject({ cgst: 900, sgst: 900, igst: 0, taxTotal: 1800, total: 11800 });
    });

    it('charges inter-state tax as IGST', () => {
      const result = calculateInvoice({
        items: oneItem(10000),
        tax: { enabled: true, type: 'IGST', rate: 18 },
      });
      expect(result).toMatchObject({ cgst: 0, sgst: 0, igst: 1800, taxTotal: 1800, total: 11800 });
    });

    it('taxes the discounted amount', () => {
      const result = calculateInvoice({
        items: oneItem(10000),
        discounts: [{ label: 'A', type: 'FLAT', value: 2000 }],
        tax: { enabled: true, type: 'IGST', rate: 18 },
      });
      expect(result.taxableAmount).toBe(8000);
      expect(result.igst).toBe(1440);
      expect(result.total).toBe(9440);
    });

    it('accepts an edited rate', () => {
      const result = calculateInvoice({
        items: oneItem(1000),
        tax: { enabled: true, type: 'CGST_SGST', rate: 12 },
      });
      expect(result.cgst).toBe(60);
      expect(result.taxTotal).toBe(120);
    });

    it('defaults to 18% when no rate is given', () => {
      const result = calculateInvoice({
        items: oneItem(100),
        tax: { enabled: true, type: 'IGST' },
      });
      expect(result.igst).toBe(18);
    });

    it('rounds halves up, and keeps CGST and SGST equal', () => {
      const result = calculateInvoice({
        items: oneItem(0.5),
        tax: { enabled: true, type: 'CGST_SGST', rate: 3 },
      });
      // 1.5% of ₹ 0.50 is 0.75 paise, which rounds up to 1 paisa each.
      expect(result).toMatchObject({ cgst: 0.01, sgst: 0.01, taxTotal: 0.02, total: 0.52 });
    });
  });

  describe('advances', () => {
    it('subtracts several advances from the total', () => {
      const result = calculateInvoice({ items: oneItem(10000), advances: [2500.5, 1000.25] });
      expect(result.advanceTotal).toBe(3500.75);
      expect(result.balanceDue).toBe(6499.25);
      expect(result.total).toBe(10000);
    });

    it('applies advances after tax', () => {
      const result = calculateInvoice({
        items: oneItem(10000),
        tax: { enabled: true, type: 'IGST', rate: 18 },
        advances: [11800],
      });
      expect(result.balanceDue).toBe(0);
      expect(result.amountInWords).toBe('Rupees Zero Only');
    });

    it('shows an overpayment as a negative balance', () => {
      const result = calculateInvoice({ items: oneItem(1000), advances: [1500] });
      expect(result.balanceDue).toBe(-500);
      expect(result.amountInWords).toBe('Minus Rupees Five Hundred Only');
    });

    it('takes amount in words from the balance, not the total', () => {
      const result = calculateInvoice({ items: oneItem(125000), advances: [25000.5] });
      expect(result.amountInWords).toBe(
        'Rupees Ninety Nine Thousand Nine Hundred Ninety Nine and Fifty Paise Only',
      );
    });
  });
});

import { describe, expect, it } from 'vitest';
import { financialYear, formatInvoiceNo, nextInvoiceNumber } from './numbering';

describe('financialYear', () => {
  it.each([
    ['2026-10-27', '2026-27'],
    ['2026-04-01', '2026-27'],
    ['2026-03-31', '2025-26'],
    ['2027-01-01', '2026-27'],
    ['2027-03-31', '2026-27'],
    ['2027-04-01', '2027-28'],
    ['2099-04-01', '2099-00'],
    ['2100-01-15', '2099-00'],
  ])('puts %s in %s', (date, fy) => {
    expect(financialYear(date)).toBe(fy);
  });
});

describe('formatInvoiceNo', () => {
  it('pads to three digits', () => {
    expect(formatInvoiceNo('AAT/INV', '2026-27', 1)).toBe('AAT/INV/2026-27/001');
    expect(formatInvoiceNo('AAT/INV', '2026-27', 42)).toBe('AAT/INV/2026-27/042');
  });

  it('keeps going past 999', () => {
    expect(formatInvoiceNo('AAT/INV', '2026-27', 1000)).toBe('AAT/INV/2026-27/1000');
  });

  it('uses the configured prefix', () => {
    expect(formatInvoiceNo('A2/BILL', '2026-27', 7)).toBe('A2/BILL/2026-27/007');
  });
});

describe('nextInvoiceNumber', () => {
  const settings = { invoicePrefix: 'AAT/INV', nextInvoiceSeq: 2, currentFY: '2026-27' };

  it('uses the counter within the current year', () => {
    expect(nextInvoiceNumber(settings, '2026-11-05')).toEqual({
      invoiceNo: 'AAT/INV/2026-27/002',
      settings: { nextInvoiceSeq: 3, currentFY: '2026-27' },
    });
  });

  it('still uses the counter on the last day of the year', () => {
    expect(nextInvoiceNumber(settings, '2027-03-31').invoiceNo).toBe('AAT/INV/2026-27/002');
  });

  it('restarts at 001 on 1 April', () => {
    expect(nextInvoiceNumber({ ...settings, nextInvoiceSeq: 87 }, '2027-04-01')).toEqual({
      invoiceNo: 'AAT/INV/2027-28/001',
      settings: { nextInvoiceSeq: 2, currentFY: '2027-28' },
    });
  });

  it('restarts when a whole year was skipped', () => {
    expect(nextInvoiceNumber(settings, '2029-06-01').invoiceNo).toBe('AAT/INV/2029-30/001');
  });

  it('continues the earlier series for a backdated invoice, leaving the counter alone', () => {
    const april = { ...settings, currentFY: '2027-28', nextInvoiceSeq: 5 };
    const earlier = ['AAT/INV/2026-27/001', 'AAT/INV/2026-27/086', 'AAT/INV/2026-27/012'];

    expect(nextInvoiceNumber(april, '2027-03-30', earlier)).toEqual({
      invoiceNo: 'AAT/INV/2026-27/087',
      settings: null,
    });
  });

  it('starts at 001 when an earlier year has no invoices', () => {
    expect(nextInvoiceNumber(settings, '2025-05-01', []).invoiceNo).toBe('AAT/INV/2025-26/001');
  });
});

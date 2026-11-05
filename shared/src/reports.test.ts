import { describe, expect, it } from 'vitest';
import { renderStatementHtml } from './invoice/statement';
import { financialYearRange, formatCompactINR, type OutstandingReport } from './reports';

describe('formatCompactINR', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1K'],
    [25000, '25K'],
    [100000, '1L'],
    [150000, '1.5L'],
    [10000000, '1Cr'],
    [25000000, '2.5Cr'],
  ])('writes %d', (amount, text) => {
    expect(formatCompactINR(amount)).toBe(text);
  });
});

describe('financialYearRange', () => {
  it('runs from April to March', () => {
    expect(financialYearRange('2026-27')).toEqual({ from: '2026-04-01', to: '2027-03-31' });
  });
});

describe('renderStatementHtml', () => {
  const company = {
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
  };
  const report: OutstandingReport = {
    asOf: '2026-11-05',
    outstanding: 16000,
    overdue: 0,
    clients: [
      {
        clientId: 'c1',
        clientName: 'Agamathi <Educationals>',
        billed: 26000,
        paid: 10000,
        outstanding: 16000,
        overdue: 0,
        invoices: [
          {
            id: 'i1',
            invoiceNo: 'AAT/INV/2026-27/001',
            invoiceDate: '2026-10-27',
            dueDate: '2026-11-06',
            total: 26000,
            paid: 10000,
            balance: 16000,
            status: 'PARTIALLY_PAID',
            daysOverdue: 0,
          },
        ],
      },
    ],
  };

  it('lists the balance per invoice and in total', () => {
    const html = renderStatementHtml(report, company);
    expect(html).toContain('STATEMENT');
    expect(html).toContain('AAT/INV/2026-27/001');
    expect(html).toContain('16,000.00');
    expect(html).toContain('05 Nov 2026');
    expect(html).toContain('Partially paid');
  });

  it('escapes client names', () => {
    const html = renderStatementHtml(report, company);
    expect(html).not.toContain('<Educationals>');
    expect(html).toContain('&lt;Educationals&gt;');
  });

  it('says so when nothing is outstanding', () => {
    const empty = { ...report, outstanding: 0, clients: [] };
    expect(renderStatementHtml(empty, company)).toContain('Nothing is outstanding.');
  });
});

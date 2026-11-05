import { describe, expect, it } from 'vitest';
import { addDays, formatDate, formatINR } from './format';

describe('formatINR', () => {
  it.each([
    [0, '₹ 0.00'],
    [999, '₹ 999.00'],
    [1000, '₹ 1,000.00'],
    [16000, '₹ 16,000.00'],
    [125000, '₹ 1,25,000.00'],
    [1234567.5, '₹ 12,34,567.50'],
    [10000000, '₹ 1,00,00,000.00'],
    [9999999999.99, '₹ 9,99,99,99,999.99'],
  ])('formats %d', (amount, text) => {
    expect(formatINR(amount)).toBe(text);
  });

  it('shows negatives with a leading minus', () => {
    expect(formatINR(-2000)).toBe('− ₹ 2,000.00');
  });

  it('does not show a minus on zero', () => {
    expect(formatINR(-0)).toBe('₹ 0.00');
  });
});

describe('formatDate', () => {
  it('writes the short month', () => {
    expect(formatDate('2026-10-27')).toBe('27 Oct 2026');
    expect(formatDate('2026-11-06')).toBe('06 Nov 2026');
  });
});

describe('addDays', () => {
  it('matches the sample invoice due date', () => {
    expect(addDays('2026-10-27', 10)).toBe('2026-11-06');
  });

  it('crosses a year end', () => {
    expect(addDays('2026-12-25', 10)).toBe('2027-01-04');
  });

  it('handles leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('leaves the date alone for zero days', () => {
    expect(addDays('2026-10-27', 0)).toBe('2026-10-27');
  });
});

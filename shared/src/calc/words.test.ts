import { describe, expect, it } from 'vitest';
import { amountInWords } from './words';

describe('amountInWords', () => {
  it.each([
    [0, 'Rupees Zero Only'],
    [1, 'Rupees One Only'],
    [10, 'Rupees Ten Only'],
    [13, 'Rupees Thirteen Only'],
    [20, 'Rupees Twenty Only'],
    [42, 'Rupees Forty Two Only'],
    [100, 'Rupees One Hundred Only'],
    [115, 'Rupees One Hundred Fifteen Only'],
    [1000, 'Rupees One Thousand Only'],
    [1001, 'Rupees One Thousand One Only'],
    [16000, 'Rupees Sixteen Thousand Only'],
    [99999, 'Rupees Ninety Nine Thousand Nine Hundred Ninety Nine Only'],
  ])('writes %d', (amount, words) => {
    expect(amountInWords(amount)).toBe(words);
  });

  it.each([
    [100000, 'Rupees One Lakh Only'],
    [125000, 'Rupees One Lakh Twenty Five Thousand Only'],
    [1000001, 'Rupees Ten Lakh One Only'],
    [10000000, 'Rupees One Crore Only'],
    [
      12345678,
      'Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only',
    ],
    [
      9999999999,
      'Rupees Nine Hundred Ninety Nine Crore Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine Only',
    ],
  ])('uses lakh and crore for %d', (amount, words) => {
    expect(amountInWords(amount)).toBe(words);
  });

  it.each([
    [10.5, 'Rupees Ten and Fifty Paise Only'],
    [1000.05, 'Rupees One Thousand and Five Paise Only'],
    [0.75, 'Seventy Five Paise Only'],
    [0.01, 'One Paise Only'],
    [125000.99, 'Rupees One Lakh Twenty Five Thousand and Ninety Nine Paise Only'],
  ])('includes paise for %d', (amount, words) => {
    expect(amountInWords(amount)).toBe(words);
  });

  it('handles paise that floating point stores inexactly', () => {
    expect(amountInWords(1.15)).toBe('Rupees One and Fifteen Paise Only');
    expect(amountInWords(0.07)).toBe('Seven Paise Only');
  });

  it('marks negative amounts', () => {
    expect(amountInWords(-500)).toBe('Minus Rupees Five Hundred Only');
  });
});

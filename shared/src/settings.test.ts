import { describe, expect, it } from 'vitest';
import { changePasswordSchema, newUserSchema, settingsSchema, signatureSchema } from './settings';

const valid = {
  name: 'Artificial Augment Technologies',
  addressLine: 'Bangalore | Salem',
  phone: '+91 93443 52823',
  email: 'admin@artificialaugmenttechnologies.com',
  website: 'www.artificialaugmenttechnologies.com',
  invoicePrefix: 'AAT/INV',
  nextInvoiceSeq: 2,
  defaultTerms: '1. Pay on time.',
  defaultPaymentTermDays: 10,
  gstEnabledDefault: false,
};

const messages = (input: unknown) => {
  const result = settingsSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('settingsSchema', () => {
  it('accepts valid settings and turns blanks into null', () => {
    const parsed = settingsSchema.parse({
      ...valid,
      gstin: '',
      bankName: ' ',
      nextInvoiceSeq: '7',
    });
    expect(parsed).toMatchObject({ gstin: null, bankName: null, nextInvoiceSeq: 7 });
  });

  it.each(['AAT/INV/', '/AAT', 'AAT//INV', 'AAT INV', '<b>'])('rejects the prefix %s', (prefix) => {
    expect(messages({ ...valid, invoicePrefix: prefix })).toContain(
      'Use letters, digits, hyphens and slashes',
    );
  });

  it.each(['A2', 'AAT/INV', 'A2-TECH/INV/2'])('accepts the prefix %s', (prefix) => {
    expect(messages({ ...valid, invoicePrefix: prefix })).toEqual([]);
  });

  it('rejects a next number below 1', () => {
    expect(messages({ ...valid, nextInvoiceSeq: 0 })).toContain('Must be at least 1');
  });
});

describe('signatureSchema', () => {
  const parse = (signatureUrl: unknown) => signatureSchema.safeParse({ signatureUrl }).success;

  it('accepts images and clearing', () => {
    expect(parse('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(parse(null)).toBe(true);
  });

  it.each([
    'https://example.com/sign.png',
    'file:///C:/Windows/win.ini',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:text/html;base64,PGI+',
  ])('rejects %s', (url) => {
    expect(parse(url)).toBe(false);
  });

  it('rejects an oversized image', () => {
    expect(parse(`data:image/png;base64,${'A'.repeat(700_000)}`)).toBe(false);
  });
});

describe('passwords', () => {
  it('needs at least 8 characters for a new user', () => {
    const user = { name: 'A', email: 'a@example.com', role: 'STAFF', password: 'short' };
    expect(newUserSchema.safeParse(user).success).toBe(false);
    expect(newUserSchema.safeParse({ ...user, password: 'long-enough' }).success).toBe(true);
  });

  it('caps length where bcrypt stops reading', () => {
    const change = { currentPassword: 'x', newPassword: 'a'.repeat(73) };
    expect(changePasswordSchema.safeParse(change).success).toBe(false);
  });
});

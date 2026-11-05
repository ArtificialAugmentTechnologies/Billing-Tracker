import { z } from 'zod';

export const MAX_MONEY = 9_999_999_999.99;

/** Optional text field: a blank form input is stored as null. */
export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .nullish()
    .transform((value) => value || null);

/** Optional YYYY-MM-DD date: a blank form input is stored as null. */
export const optionalDate = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Enter a valid date')
  .nullish()
  .transform((value) => value || null);

export const money = z.coerce
  .number({ invalid_type_error: 'Enter an amount' })
  .min(0, 'Amount cannot be negative')
  .max(MAX_MONEY, 'Amount is too large')
  .transform((value) => Math.round(value * 100) / 100);

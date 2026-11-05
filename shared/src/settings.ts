import { z } from 'zod';
import { ROLES, type Role } from './auth';
import { money, optionalText } from './validation';

export const MAX_SIGNATURE_LENGTH = 700_000;

export const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Enter the company name').max(200),
  addressLine: z.string().trim().min(1, 'Enter the address').max(200),
  phone: z.string().trim().min(1, 'Enter a phone number').max(30),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  website: z.string().trim().min(1, 'Enter the website').max(200),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([0-9A-Z]{15})?$/, 'GSTIN must be 15 letters and digits')
    .nullish()
    .transform((value) => value || null),
  bankAccountName: optionalText(),
  bankName: optionalText(),
  bankAccountNo: optionalText(40),
  bankIfsc: optionalText(20),
  upiId: optionalText(100),
  invoicePrefix: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]+(\/[A-Za-z0-9-]+)*$/, 'Use letters, digits, hyphens and slashes')
    .max(30),
  nextInvoiceSeq: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int('Enter a whole number')
    .min(1, 'Must be at least 1')
    .max(999_999, 'Too large'),
  defaultTerms: z.string().trim().min(1, 'Enter the default terms').max(2000),
  defaultPaymentTermDays: z.coerce
    .number({ invalid_type_error: 'Enter the number of days' })
    .int('Enter whole days')
    .min(0, 'Cannot be negative')
    .max(365, 'Keep this under a year'),
  gstEnabledDefault: z.boolean(),
});
export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsPayload = z.output<typeof settingsSchema>;

export type SettingsRecord = SettingsPayload & {
  currentFY: string;
  signatureUrl: string | null;
};

export const signatureSchema = z.object({
  signatureUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Use a PNG, JPEG or WebP image')
    .max(MAX_SIGNATURE_LENGTH, 'Keep the image under 500 KB')
    .nullable(),
});

export const catalogItemSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title').max(200),
  subDescription: optionalText(500),
  defaultRate: money,
  category: optionalText(60),
});
export type CatalogItemInput = z.input<typeof catalogItemSchema>;
export type CatalogItemPayload = z.output<typeof catalogItemSchema>;

const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Keep this under 72 characters');

export const newUserSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(ROLES),
  password,
});
export type NewUserInput = z.infer<typeof newUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(100),
  role: z.enum(ROLES),
});

export const resetPasswordSchema = z.object({ password });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export type SearchKind = 'client' | 'project' | 'invoice';

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string | null;
}

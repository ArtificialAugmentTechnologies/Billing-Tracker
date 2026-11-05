import { z } from 'zod';
import type { InvoiceRow } from './invoices';
import type { ProjectSummary } from './projects';
import { optionalText } from './validation';

export const CLIENT_TYPES = ['COLLEGE', 'COMPANY', 'PARTNER', 'INDIVIDUAL'] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  COLLEGE: 'College',
  COMPANY: 'Company',
  PARTNER: 'Partner',
  INDIVIDUAL: 'Individual',
};

export const CLIENT_SORTS = ['name', 'recent', 'outstanding'] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Enter the client name').max(200),
  alias: optionalText(),
  type: z.enum(CLIENT_TYPES),
  addressLine1: optionalText(),
  addressLine2: optionalText(),
  city: optionalText(100),
  state: optionalText(100),
  pin: z
    .string()
    .trim()
    .regex(/^(\d{6})?$/, 'PIN must be 6 digits')
    .nullish()
    .transform((value) => value || null),
  contactPerson: optionalText(),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address')
    .or(z.literal(''))
    .nullish()
    .transform((value) => value || null),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([0-9A-Z]{15})?$/, 'GSTIN must be 15 letters and digits')
    .nullish()
    .transform((value) => value || null),
  notes: optionalText(2000),
});
export type ClientInput = z.input<typeof clientSchema>;
export type ClientPayload = z.output<typeof clientSchema>;

export type ClientRecord = ClientPayload & { id: string };

export interface BillingTotals {
  billed: number;
  received: number;
  outstanding: number;
}

export interface ClientSummary extends BillingTotals {
  id: string;
  name: string;
  alias: string | null;
  type: ClientType;
  city: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  projectCount: number;
}

export interface ClientDetail extends ClientRecord, BillingTotals {
  projects: ProjectSummary[];
  invoices: InvoiceRow[];
}

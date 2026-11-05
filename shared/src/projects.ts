import { z } from 'zod';
import type { BillingTotals } from './clients';
import type { InvoiceRow } from './invoices';
import { money, optionalDate, optionalText } from './validation';

export const PROJECT_STATUSES = ['ACTIVE', 'COMPLETED', 'ON_HOLD'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
};

export const MILESTONE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BILLED'] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  BILLED: 'Billed',
};

export const projectSchema = z.object({
  clientId: z.string().min(1, 'Choose a client'),
  name: z.string().trim().min(1, 'Enter the project name').max(200),
  refCode: z.string().trim().toUpperCase().min(1, 'Enter a reference code').max(40),
  description: optionalText(2000),
  contractValue: money,
  startDate: optionalDate,
  status: z.enum(PROJECT_STATUSES),
});
export type ProjectInput = z.input<typeof projectSchema>;
export type ProjectPayload = z.output<typeof projectSchema>;

export const milestoneSchema = z.object({
  name: z.string().trim().min(1, 'Enter the milestone name').max(200),
  plannedAmount: money,
  dueDate: optionalDate,
  status: z.enum(MILESTONE_STATUSES),
});
export type MilestoneInput = z.input<typeof milestoneSchema>;
export type MilestonePayload = z.output<typeof milestoneSchema>;

export type MilestoneRecord = MilestonePayload & { id: string; order: number };

export interface ProjectSummary extends BillingTotals {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  refCode: string;
  contractValue: number;
  startDate: string | null;
  status: ProjectStatus;
  milestoneCount: number;
}

export interface ProjectDetail extends ProjectSummary {
  description: string | null;
  milestones: MilestoneRecord[];
  invoices: InvoiceRow[];
}

const lettersOf = (text: string) => text.toUpperCase().replace(/[^A-Z]/g, '');

/** First letter plus the following consonants: "Agamathikalvi" gives "AGM". */
function clientCode(label: string) {
  const [first = '', ...rest] = lettersOf(label);
  const consonants = rest.filter((letter) => !'AEIOU'.includes(letter));
  return (first + consonants.join('')).slice(0, 3);
}

/** Suggests a code like AAT/PRJ/AGM-WEB, ignoring project words that just repeat the client. */
export function suggestRefCode(clientLabel: string, projectName: string) {
  const client = lettersOf(clientLabel);
  const word = projectName
    .split(/\s+/)
    .map(lettersOf)
    .find((candidate) => candidate && candidate !== client && !client.startsWith(candidate));
  if (!client || !word) return '';
  return `AAT/PRJ/${clientCode(clientLabel)}-${word.slice(0, 3)}`;
}

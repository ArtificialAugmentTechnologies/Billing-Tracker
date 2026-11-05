import { z } from 'zod';

export const ROLES = ['ADMIN', 'STAFF'] as const;
export type Role = (typeof ROLES)[number];

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

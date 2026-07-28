import { z } from 'zod';
import type { SortField, SortDir } from '@shared/types.js';

export class ValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`validation failed: ${issues.join('; ')}`);
    this.name = 'ValidationError';
  }
}

const csv = z
  .string()
  .optional()
  .transform((v) => (v ?? '').split(',').map((s) => s.trim()).filter((s) => s.length > 0));

const usersSchema = z.object({
  q: z.string().optional().transform((v) => (v ?? '').trim()),
  hobbies: csv,
  nationalities: csv,
  sort: z
    .enum(['first_name', 'last_name', 'age', 'nationality'])
    .optional()
    .transform((v): SortField => v ?? 'last_name'),
  dir: z
    .enum(['asc', 'desc'])
    .optional()
    .transform((v): SortDir => v ?? 'asc'),
  cursor: z.string().optional().transform((v) => v ?? null),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v == null ? 50 : Number.parseInt(v, 10);
      if (Number.isNaN(n)) return 50;
      return Math.min(200, Math.max(1, n));
    }),
});

const facetsSchema = usersSchema.pick({ q: true, hobbies: true, nationalities: true });

export type ParsedUsersQuery = z.infer<typeof usersSchema>;
export type ParsedFacetsQuery = z.infer<typeof facetsSchema>;

export function parseUsersQuery(raw: unknown): ParsedUsersQuery {
  const r = usersSchema.safeParse(raw);
  if (!r.success) throw new ValidationError(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  return r.data;
}

export function parseFacetsQuery(raw: unknown): ParsedFacetsQuery {
  const r = facetsSchema.safeParse(raw);
  if (!r.success) throw new ValidationError(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  return r.data;
}

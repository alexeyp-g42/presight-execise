import { z } from 'zod';
import { ApiError } from './errors.js';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  SORT_FIELDS,
  SORT_ORDERS,
  type SortField,
  type SortOrder,
} from '../shared/contract.js';

export interface FacetsQuery {
  q: string;
  nationalities: string[];
  hobbies: string[];
}

export interface UsersQuery extends FacetsQuery {
  sort: SortField;
  order: SortOrder;
  limit: number;
  cursor: string | undefined;
}

const FILTER_KEYS = ['q', 'nationalities', 'hobbies'] as const;
const USERS_KEYS = [...FILTER_KEYS, 'sort', 'order', 'limit', 'cursor'] as const;

/**
 * De-duplication is load-bearing, not cosmetic: `hobbies=Chess,Chess` would
 * make the requested hobby count 2 while COUNT(DISTINCT hobby_id) tops out at
 * 1, silently matching nobody.
 */
function csv(raw: string | undefined): string[] {
  if (!raw) return [];
  return Array.from(new Set(raw.split(',').map((value) => value.trim()).filter(Boolean)));
}

/**
 * An explicit allowlist rather than zod's strict mode: version-proof, and it
 * produces a message naming the offending parameter.
 */
function rejectUnknownKeys(query: Record<string, unknown>, allowed: readonly string[]): void {
  const unknown = Object.keys(query).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new ApiError('INVALID_QUERY', 400, `Unknown query parameter: ${unknown.join(', ')}`);
  }
}

const filterSchema = z.object({
  q: z.string().optional(),
  nationalities: z.string().optional(),
  hobbies: z.string().optional(),
});

const usersSchema = filterSchema.extend({
  sort: z.enum(SORT_FIELDS).optional(),
  order: z.enum(SORT_ORDERS).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
  cursor: z.string().optional(),
});

function parseOrThrow<Schema extends z.ZodType>(schema: Schema, query: unknown): z.infer<Schema> {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new ApiError('INVALID_QUERY', 400, 'Invalid query parameters', result.error.issues);
  }
  return result.data;
}

export function parseUsersQuery(query: unknown): UsersQuery {
  rejectUnknownKeys((query ?? {}) as Record<string, unknown>, USERS_KEYS);
  const parsed = parseOrThrow(usersSchema, query ?? {});

  return {
    q: parsed.q?.trim() ?? '',
    nationalities: csv(parsed.nationalities),
    hobbies: csv(parsed.hobbies),
    sort: parsed.sort ?? 'first_name',
    order: parsed.order ?? 'asc',
    limit: parsed.limit ?? DEFAULT_LIMIT,
    cursor: parsed.cursor,
  };
}

export function parseFacetsQuery(query: unknown): FacetsQuery {
  rejectUnknownKeys((query ?? {}) as Record<string, unknown>, FILTER_KEYS);
  const parsed = parseOrThrow(filterSchema, query ?? {});

  return {
    q: parsed.q?.trim() ?? '',
    nationalities: csv(parsed.nationalities),
    hobbies: csv(parsed.hobbies),
  };
}

/**
 * The HTTP contract, shared with the client through a Vite alias.
 *
 * This module must stay dependency-free: anything imported here becomes a
 * client bundle dependency. It carries types and constants only — the zod
 * schemas live in `common/params.ts`, because the two sides want different
 * behaviour from validation. The server rejects a bad value with 400; the
 * client falls back to a default so a stale link still renders.
 *
 * Field names are snake_case to match the exercise brief verbatim, which keeps
 * the database, the API, and the URL query string speaking the same language.
 */

export const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;
export const FACET_LIMIT = 20;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface ApiUser {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export interface PageInfo {
  /** Size of the whole matched set, not of this page. */
  total: number;
  returned: number;
  has_more: boolean;
  next_cursor: string | null;
}

export interface UsersResponse {
  data: ApiUser[];
  page_info: PageInfo;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface FacetsResponse {
  hobbies: FacetValue[];
  nationalities: FacetValue[];
}

export type ApiErrorCode = 'INVALID_QUERY' | 'INVALID_CURSOR' | 'NOT_FOUND' | 'INTERNAL';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

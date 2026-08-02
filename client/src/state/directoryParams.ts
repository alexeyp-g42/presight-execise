import { SORT_FIELDS, SORT_ORDERS, type SortField, type SortOrder } from '@contract';

export interface DirectoryParams {
  q: string;
  nationalities: string[];
  hobbies: string[];
  sort: SortField;
  order: SortOrder;
}

export const DEFAULT_PARAMS: DirectoryParams = {
  q: '',
  nationalities: [],
  hobbies: [],
  sort: 'first_name',
  order: 'asc',
};

/**
 * De-duplicated for the same reason the server does it: a repeated hobby would
 * inflate the requested count and match nobody.
 */
function parseCsv(raw: string | null): string[] {
  if (!raw) return [];
  return Array.from(new Set(raw.split(',').map((value) => value.trim()).filter(Boolean)));
}

function oneOf<T extends string>(options: readonly T[], raw: string | null, fallback: T): T {
  return options.includes(raw as T) ? (raw as T) : fallback;
}

/**
 * Lenient by design. The API rejects a bad `sort` with 400, but a hand-edited
 * or stale link should still render something — so an unrecognised value falls
 * back to its default rather than throwing.
 */
export function parseDirectoryParams(searchParams: URLSearchParams): DirectoryParams {
  return {
    q: searchParams.get('q') ?? '',
    nationalities: parseCsv(searchParams.get('nationalities')),
    hobbies: parseCsv(searchParams.get('hobbies')),
    sort: oneOf(SORT_FIELDS, searchParams.get('sort'), DEFAULT_PARAMS.sort),
    order: oneOf(SORT_ORDERS, searchParams.get('order'), DEFAULT_PARAMS.order),
  };
}

/** Defaults are omitted so the common case leaves the URL clean. */
export function serializeDirectoryParams(params: DirectoryParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  const q = params.q.trim();

  if (q) searchParams.set('q', q);
  if (params.nationalities.length > 0) searchParams.set('nationalities', params.nationalities.join(','));
  if (params.hobbies.length > 0) searchParams.set('hobbies', params.hobbies.join(','));
  if (params.sort !== DEFAULT_PARAMS.sort) searchParams.set('sort', params.sort);
  if (params.order !== DEFAULT_PARAMS.order) searchParams.set('order', params.order);

  return searchParams;
}

export function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function activeFilterCount(params: DirectoryParams): number {
  return params.nationalities.length + params.hobbies.length;
}

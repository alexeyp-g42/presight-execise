import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortField, SortDir } from '@shared/types';

export interface UrlFilter {
  q: string;
  hobbies: string[];
  nationalities: string[];
  sort: SortField;
  dir: SortDir;
}

const SORT_FIELDS: SortField[] = ['first_name', 'last_name', 'age', 'nationality'];

function parseCsv(v: string | null): string[] {
  if (!v) return [];
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseSort(v: string | null): SortField {
  return (SORT_FIELDS as string[]).includes(v ?? '') ? (v as SortField) : 'last_name';
}

function parseDir(v: string | null): SortDir {
  return v === 'desc' ? 'desc' : 'asc';
}

export function useUrlState() {
  const [sp, setSp] = useSearchParams();

  const state: UrlFilter = useMemo(
    () => ({
      q: sp.get('q') ?? '',
      hobbies: parseCsv(sp.get('hobbies')),
      nationalities: parseCsv(sp.get('nationalities')),
      sort: parseSort(sp.get('sort')),
      dir: parseDir(sp.get('dir')),
    }),
    [sp]
  );

  const patch = useCallback(
    (delta: Partial<UrlFilter>) => {
      const next = { ...state, ...delta };
      const params = new URLSearchParams();
      if (next.q) params.set('q', next.q);
      if (next.hobbies.length) params.set('hobbies', next.hobbies.join(','));
      if (next.nationalities.length) params.set('nationalities', next.nationalities.join(','));
      if (next.sort !== 'last_name') params.set('sort', next.sort);
      if (next.dir !== 'asc') params.set('dir', next.dir);
      setSp(params, { replace: false });
    },
    [state, setSp]
  );

  const toggleHobby = useCallback(
    (h: string) => {
      const has = state.hobbies.includes(h);
      const hobbies = has ? state.hobbies.filter((x) => x !== h) : [...state.hobbies, h];
      patch({ hobbies });
    },
    [state.hobbies, patch]
  );

  const toggleNationality = useCallback(
    (n: string) => {
      const has = state.nationalities.includes(n);
      const nationalities = has
        ? state.nationalities.filter((x) => x !== n)
        : [...state.nationalities, n];
      patch({ nationalities });
    },
    [state.nationalities, patch]
  );

  const clear = useCallback(() => setSp(new URLSearchParams(), { replace: false }), [setSp]);

  return { state, patch, toggleHobby, toggleNationality, clear };
}

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { UsersResponse, FacetsResponse, SortField, SortDir } from '@shared/types';
import { apiGet } from './client';

export interface Filter {
  q: string;
  hobbies: string[];
  nationalities: string[];
  sort: SortField;
  dir: SortDir;
}

function baseParams(f: Filter): Record<string, string> {
  return {
    q: f.q,
    hobbies: f.hobbies.join(','),
    nationalities: f.nationalities.join(','),
  };
}

export function useUsersQuery(filter: Filter) {
  return useInfiniteQuery({
    queryKey: ['users', filter],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      apiGet<UsersResponse>('/api/users', {
        ...baseParams(filter),
        sort: filter.sort,
        dir: filter.dir,
        limit: '50',
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useFacetsQuery(filter: Filter) {
  return useQuery({
    queryKey: ['facets', filter.q, filter.hobbies, filter.nationalities],
    queryFn: () => apiGet<FacetsResponse>('/api/facets', baseParams(filter)),
  });
}

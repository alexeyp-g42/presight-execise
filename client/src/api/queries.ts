import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { DEFAULT_LIMIT, type FacetsResponse, type UsersResponse } from '@contract';
import type { DirectoryParams } from '../state/directoryParams';
import { fetchJson } from './client';

function filterSearchParams(params: DirectoryParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  const q = params.q.trim();

  if (q) searchParams.set('q', q);
  if (params.nationalities.length > 0) searchParams.set('nationalities', params.nationalities.join(','));
  if (params.hobbies.length > 0) searchParams.set('hobbies', params.hobbies.join(','));

  return searchParams;
}

/** Sorted so that selecting A then B caches the same as B then A. */
function filterKey(params: DirectoryParams) {
  return [params.q.trim(), [...params.nationalities].sort(), [...params.hobbies].sort()] as const;
}

export function useUsersInfinite(params: DirectoryParams) {
  return useInfiniteQuery({
    queryKey: ['users', ...filterKey(params), params.sort, params.order],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => {
      const searchParams = filterSearchParams(params);
      searchParams.set('sort', params.sort);
      searchParams.set('order', params.order);
      searchParams.set('limit', String(DEFAULT_LIMIT));
      if (pageParam) searchParams.set('cursor', pageParam);

      return fetchJson<UsersResponse>(`/api/users?${searchParams.toString()}`, signal);
    },
    getNextPageParam: (lastPage) => lastPage.page_info.next_cursor ?? undefined,
    // Hold the previous page while a new filter is in flight, so the list does
    // not blank out between keystrokes.
    placeholderData: keepPreviousData,
  });
}

/**
 * Keyed on the filters only. Facets do not depend on sort order, so changing
 * the sort must not refetch — or flicker — the sidebar.
 */
export function useFacets(params: DirectoryParams) {
  return useQuery({
    queryKey: ['facets', ...filterKey(params)],
    queryFn: ({ signal }) =>
      fetchJson<FacetsResponse>(`/api/facets?${filterSearchParams(params).toString()}`, signal),
    placeholderData: keepPreviousData,
  });
}

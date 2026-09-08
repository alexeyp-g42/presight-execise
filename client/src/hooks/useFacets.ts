import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchFacets } from '../api/client'
import type { FilterState } from '../api/types'

export function useFacets(state: FilterState) {
  return useQuery({
    queryKey: [
      'facets',
      { q: state.q, nationalities: state.nationalities, hobbies: state.hobbies },
    ],
    queryFn: ({ signal }) => fetchFacets(state, signal),
    placeholderData: keepPreviousData,
  })
}

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toSearchParams } from '../api/client'
import {
  DEFAULT_FILTER_STATE,
  type FilterState,
  type SortField,
  type SortOrder,
} from '../api/types'

const SORT_FIELDS: SortField[] = ['first_name', 'last_name', 'age', 'nationality']
const SORT_ORDERS: SortOrder[] = ['asc', 'desc']

export function parseFilterStateFromParams(params: URLSearchParams): FilterState {
  const sort = params.get('sort')
  const order = params.get('order')

  return {
    q: params.get('q')?.trim() ?? DEFAULT_FILTER_STATE.q,
    nationalities: params.getAll('nationalities').filter((value) => value.length > 0),
    hobbies: params.getAll('hobbies').filter((value) => value.length > 0),
    sort: SORT_FIELDS.includes(sort as SortField) ? (sort as SortField) : DEFAULT_FILTER_STATE.sort,
    order: SORT_ORDERS.includes(order as SortOrder)
      ? (order as SortOrder)
      : DEFAULT_FILTER_STATE.order,
  }
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
}

export interface FilterStateControls {
  state: FilterState
  setText(value: string): void
  toggleHobby(value: string): void
  toggleNationality(value: string): void
  setSort(sort: SortField): void
  setOrder(order: SortOrder): void
  clearAll(): void
}

export function useFilterState(): FilterStateControls {
  const [searchParams, setSearchParams] = useSearchParams()
  const state = useMemo(() => parseFilterStateFromParams(searchParams), [searchParams])

  const apply = useCallback(
    (next: FilterState, replace: boolean) => {
      setSearchParams(toSearchParams(next), { replace })
    },
    [setSearchParams],
  )

  return useMemo(
    () => ({
      state,
      setText: (value) => apply({ ...state, q: value.trim() }, true),
      toggleHobby: (value) => apply({ ...state, hobbies: toggle(state.hobbies, value) }, false),
      toggleNationality: (value) =>
        apply({ ...state, nationalities: toggle(state.nationalities, value) }, false),
      setSort: (sort) => apply({ ...state, sort }, false),
      setOrder: (order) => apply({ ...state, order }, false),
      clearAll: () => apply({ ...state, q: '', nationalities: [], hobbies: [] }, false),
    }),
    [apply, state],
  )
}

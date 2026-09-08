export type SortField = 'first_name' | 'last_name' | 'age' | 'nationality'
export type SortOrder = 'asc' | 'desc'

export interface FilterState {
  q: string
  nationalities: string[]
  hobbies: string[]
  sort: SortField
  order: SortOrder
}

export interface User {
  id: number
  avatar: string
  first_name: string
  last_name: string
  age: number
  nationality: string
  hobbies: string[]
}

export interface UserPage {
  items: User[]
  pageInfo: { nextCursor: string | null; hasMore: boolean }
}

export interface FacetValue {
  value: string
  count: number
}

export interface Facets {
  total: number
  hobbies: FacetValue[]
  nationalities: FacetValue[]
}

export const DEFAULT_FILTER_STATE: FilterState = {
  q: '',
  nationalities: [],
  hobbies: [],
  sort: 'first_name',
  order: 'asc',
}

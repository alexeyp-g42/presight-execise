import { SORT_DIRECTIONS, type SortDirection, USER_SORT_FIELDS, type UserSortField } from '@presight/schema'
import type { UserFilters } from '../api/types'

export const DEFAULT_FILTERS: UserFilters = {
    search: '',
    hobbyIds: [],
    nationalityCodes: [],
    sortField: 'last_name',
    sortDir: 'asc',
}

/**
 * Query-string keys. Deliberately shorter and more readable than the API's own parameter names —
 * this is a URL a person may share, not the request the client ends up making.
 */
const PARAM = {
    search: 'search',
    hobbies: 'hobby',
    nationalities: 'nat',
    sort: 'sort',
} as const

function splitList(value: string | null): string[] {
    if (!value) return []
    return [
        ...new Set(
            value
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean),
        ),
    ]
}

// A URL is user input: anything unrecognised falls back to the default rather than reaching the API.
function isSortField(value: string | undefined): value is UserSortField {
    return USER_SORT_FIELDS.includes(value as UserSortField)
}

function isSortDirection(value: string | undefined): value is SortDirection {
    return SORT_DIRECTIONS.includes(value as SortDirection)
}

/** Rebuilds filter state from a query string, e.g. `?search=sa&hobby=6e29c2&sort=age:desc`. */
export function readFiltersFromUrl(queryString: string): UserFilters {
    const params = new URLSearchParams(queryString)
    const [sortField, sortDir] = (params.get(PARAM.sort) ?? '').split(':')

    return {
        search: params.get(PARAM.search) ?? DEFAULT_FILTERS.search,
        hobbyIds: splitList(params.get(PARAM.hobbies)),
        nationalityCodes: splitList(params.get(PARAM.nationalities)),
        sortField: isSortField(sortField) ? sortField : DEFAULT_FILTERS.sortField,
        sortDir: isSortDirection(sortDir) ? sortDir : DEFAULT_FILTERS.sortDir,
    }
}

/** Serialises filter state, omitting anything left at its default so the URL stays short. */
export function filtersToQueryString(filters: UserFilters): string {
    const params = new URLSearchParams()
    const search = filters.search.trim()

    if (search) params.set(PARAM.search, search)
    if (filters.hobbyIds.length > 0) params.set(PARAM.hobbies, filters.hobbyIds.join(','))
    if (filters.nationalityCodes.length > 0) {
        params.set(PARAM.nationalities, filters.nationalityCodes.join(','))
    }
    if (filters.sortField !== DEFAULT_FILTERS.sortField || filters.sortDir !== DEFAULT_FILTERS.sortDir) {
        params.set(PARAM.sort, `${filters.sortField}:${filters.sortDir}`)
    }

    // `toString()` escapes the list and sort separators, giving `hobby=a%2Cb&sort=age%3Adesc`.
    // Both are legal unencoded in a query string, and these links are meant to be shared and read.
    // Safe to unescape blindly: parsing splits on them only for `hobby`/`nat`/`sort`, whose values
    // are ids, codes and enum members — none of which can contain a comma or colon themselves.
    return params.toString().replaceAll('%2C', ',').replaceAll('%3A', ':')
}

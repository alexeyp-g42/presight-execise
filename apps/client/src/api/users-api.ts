// Real API layer. Every response is parsed with the shared zod schemas, so contract drift surfaces
// here as a thrown error instead of as `undefined` somewhere deep in the tree.
import {
    type Hobby,
    hobbyListSchema,
    MAX_PAGE_SIZE,
    type Nationality,
    nationalityListSchema,
    type UserSearchResult,
    userSearchResultSchema,
} from '@presight/schema'
import type { UserFilters } from './types'

/**
 * Same-origin by default: Vite proxies `/api` in dev, nginx proxies it in the container. A relative
 * base means nothing about the deployment is compiled into the bundle, so one build runs anywhere
 * and no cross-origin request is ever made.
 *
 * Setting VITE_API_BASE_URL to an absolute URL opts back into calling another origin directly, in
 * which case that origin must be listed in the server's CORS_ORIGIN.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const PAGE_SIZE = Math.min(40, MAX_PAGE_SIZE)

async function getJson(path: string): Promise<unknown> {
    const response = await fetch(`${API_BASE}${path}`)
    if (!response.ok) {
        throw new Error(`GET ${path} failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
}

/** `GET /hobbies` — the full reference list backing the hobby picker. */
export async function fetchHobbies(): Promise<Hobby[]> {
    return hobbyListSchema.parse(await getJson('/hobbies'))
}

/** `GET /nationalities` — the full reference list backing the nationality picker. */
export async function fetchNationalities(): Promise<Nationality[]> {
    return nationalityListSchema.parse(await getJson('/nationalities'))
}

/**
 * `GET /users` — one page of results plus the facet counts for the current filter state.
 * The single search box is sent as both `first_name` and `last_name`; the server OR-s them.
 */
export async function fetchUsers(filters: UserFilters, offset: number): Promise<UserSearchResult> {
    const params = new URLSearchParams()

    const search = filters.search.trim()
    if (search) {
        params.set('first_name', search)
        params.set('last_name', search)
    }
    if (filters.hobbyIds.length > 0) params.set('hobby_id', filters.hobbyIds.join(','))
    if (filters.nationalityCodes.length > 0) params.set('nationality_code', filters.nationalityCodes.join(','))

    params.set('orderby', filters.sortField)
    params.set('sort', filters.sortDir)
    params.set('offset', String(offset))
    params.set('pagesize', String(PAGE_SIZE))

    return userSearchResultSchema.parse(await getJson(`/users?${params}`))
}

/** Offset of the next page for `useInfiniteQuery`, or `undefined` once the last page is loaded. */
export function nextPageOffset(page: UserSearchResult): number | undefined {
    const { offset, pagesize, has_more } = page.pagination
    return has_more ? offset + pagesize : undefined
}

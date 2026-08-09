import { z } from 'zod'
import { hobbySchema } from './hobby'
import { userSchema } from './user'

/** Fields `GET /users` can be sorted by. `nationality` sorts on the display label, not the code. */
export const USER_SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const
export type UserSortField = (typeof USER_SORT_FIELDS)[number]

export const SORT_DIRECTIONS = ['asc', 'desc'] as const
export type SortDirection = (typeof SORT_DIRECTIONS)[number]

export const MAX_PAGE_SIZE = 100
export const DEFAULT_PAGE_SIZE = 20

/** Comma-separated query parameter -> trimmed, de-duplicated list. Absent or empty yields `[]`. */
const csvList = z
    .string()
    .optional()
    .transform((value) => [
        ...new Set(
            (value ?? '')
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean),
        ),
    ])

/** Free-text query parameter. Blank strings are treated as "not provided". */
const searchText = z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined)

/**
 * Query string accepted by `GET /users`, e.g.
 * `/users?first_name=mo&last_name=ham&nationality_code=us,sa&hobby_id=6e29c2,fa8488&orderby=age&sort=asc&offset=10&pagesize=40`
 */
export const userSearchQuerySchema = z.object({
    first_name: searchText,
    last_name: searchText,
    nationality_code: csvList,
    hobby_id: csvList,
    orderby: z.enum(USER_SORT_FIELDS).default('first_name'),
    sort: z.enum(SORT_DIRECTIONS).default('asc'),
    offset: z.coerce.number().int().min(0).default(0),
    pagesize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>

/**
 * A user row as returned by `GET /users`, denormalised for display: the nationality label saves the
 * client a lookup, and `hobbies` carries the user's own hobbies (not the selected filters).
 */
export const userSearchItemSchema = userSchema.extend({
    nationality_label: z.string().min(1),
    hobbies: z.array(hobbySchema),
})

export type UserSearchItem = z.infer<typeof userSearchItemSchema>

/**
 * One entry of a "top 20" facet list. `value` is the identifier to send back as a filter
 * (`hobby_id` / `nationality_code`); `label` is the display text.
 */
export const facetValueSchema = z.object({
    value: z.string().min(1),
    label: z.string().min(1),
    count: z.number().int().nonnegative(),
})

export type FacetValue = z.infer<typeof facetValueSchema>

/** `total` counts every user matching the filters, so the client can tell whether more pages exist. */
export const paginationSchema = z.object({
    offset: z.number().int().min(0),
    pagesize: z.number().int().min(1),
    total: z.number().int().min(0),
    has_more: z.boolean(),
})

export type Pagination = z.infer<typeof paginationSchema>

/** Number of entries returned in each facet list. */
export const TOP_FACET_LIMIT = 20

export const userSearchResultSchema = z.object({
    users: z.array(userSearchItemSchema),
    pagination: paginationSchema,
    top_hobbies: z.array(facetValueSchema).max(TOP_FACET_LIMIT),
    top_nationalities: z.array(facetValueSchema).max(TOP_FACET_LIMIT),
})

export type UserSearchResult = z.infer<typeof userSearchResultSchema>

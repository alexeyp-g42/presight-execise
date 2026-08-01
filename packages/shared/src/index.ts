/* The API contract, in one file both sides import. It is `.ts` source with no
   build step and no `dependencies` — deliberately, and the two are the same
   decision: the server derives `z.enum(SORT_FIELDS)` from the arrays below
   rather than sharing a Zod schema, so no validator weight ever reaches the
   client bundle to validate params the client itself just built.

   It works under Node's native type stripping only because pnpm symlinks this
   package to a realpath outside `node_modules`. Node refuses to strip types
   under `node_modules`, so the same package as a real directory in there fails
   hard with ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING. Hence `pnpm deploy
   --legacy` is prohibited and the Docker runtime stage must copy
   `packages/shared` alongside `server/node_modules` — see CONTEXT.md. */

/* The drift this prevents is specific: the sort field union has to be agreed on
   by the client's dropdown, the server's validator and the SQL column map.
   Duplicated, a client shipping `sort=firstName` is caught only by a 400 at
   runtime. `as const` is what makes the arrays usable as a type union. */
export const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const
export const SORT_DIRS = ['asc', 'desc'] as const

export type SortField = (typeof SORT_FIELDS)[number]
export type SortDir = (typeof SORT_DIRS)[number]

/* Defaults are contract, not implementation detail: the client parses a
   hand-edited `?sort=nickname` against the arrays above and falls back to these
   without a request, and the server applies the same pair when the params are
   absent. Stated once, so the two cannot disagree about what "no sort" means. */
export const DEFAULT_SORT: SortField = 'last_name'
export const DEFAULT_DIR: SortDir = 'asc'

/* snake_case throughout, envelope included — matching the brief's own
   `first_name` and `sort=first_name`. Drizzle names its schema fields snake
   directly, so column, TS property and JSON field are one name with no mapping
   layer between them. */

/** A person as the API returns them. `hobbies` is always the full array. */
export type User = {
  id: number
  first_name: string
  last_name: string
  age: number
  nationality: string
  /** Derived from the id — `/api/avatars/<id>.svg`. Never a stored column. */
  avatar: string
  hobbies: string[]
}

export type PageInfo = {
  has_more: boolean
  /** Opaque base64url, `null` on the last page. */
  next_cursor: string | null
}

export type UserListResponse = {
  users: User[]
  page_info: PageInfo
}

/** One row the sidebar offers: a value and how many of the result set it covers. */
export type FacetEntry = {
  value: string
  count: number
}

/* Its own response rather than a field on `UserListResponse`, which is the
   contract half of the endpoint split: nothing in here varies by page or by
   sort, and a shape that carried it alongside `page_info` would say otherwise.

   Both arrays are `20 + k` long — top 20 by `count DESC, value ASC`, plus the
   selected values that missed the cut, at their true count. The client renders
   them straight through, `count: 0` included, and never reconciles them against
   its own selection state. */
export type FacetsResponse = {
  total: number
  /** Counted with the hobby selection **kept** — selecting more narrows. */
  hobbies: FacetEntry[]
  /** Counted with the nationality selection **dropped** — selecting more widens. */
  nationalities: FacetEntry[]
}

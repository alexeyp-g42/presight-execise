import { DEFAULT_DIR, DEFAULT_SORT, SORT_DIRS, SORT_FIELDS } from '@presight/shared'
import { z } from 'zod'
import { userFilterParamsSchema } from './user-filter-params.ts'

/* The list endpoint's whole query string: the filter params every filtered query
   shares, plus the four this endpoint alone understands. Built by extending
   rather than by restating, so the filters cannot drift between the list and the
   facets — and `extend` keeps the strict catchall, so an unknown key is still a
   400 here. The facets endpoint (#21) parses the base schema, which is what
   makes `?cursor=` an unrecognized key over there rather than a param it quietly
   ignores. */

/* Sort is two params, matching the brief's "controls for choosing sort field and
   sort direction" 1:1 rather than a single `sort=age:desc`. That is what lets an
   unknown field and a bad direction be two precisely different 400s naming the
   control the viewer actually touched. */
const sortField = z.enum(SORT_FIELDS).default(DEFAULT_SORT)
const sortDir = z.enum(SORT_DIRS).default(DEFAULT_DIR)

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

/* Rejected rather than clamped when out of range. Clamping is a silent
   correction the client cannot observe, and it splits the endpoint's one rule —
   invalid input is a 400 — into "some invalid input errors, some is quietly
   fixed". The ceiling exists because `limit` also sizes the hobby query behind
   the page.
 *
 * Coerced because every query-string value arrives as a string: `'50'` has to
 * become 50, while `'1.5'`, `'abc'` and a repeated key (which arrives as an
 * array) all fail rather than becoming something plausible. */
const pageLimit = z.coerce
  .number(`limit must be a whole number between 1 and ${MAX_LIMIT}`)
  .int(`limit must be a whole number between 1 and ${MAX_LIMIT}`)
  .min(1, `limit must be between 1 and ${MAX_LIMIT}`)
  .max(MAX_LIMIT, `limit must be between 1 and ${MAX_LIMIT}`)
  .default(DEFAULT_LIMIT)

/* Left as an opaque string here and decoded in `listUsers`, which is not
   squeamishness about transforms: a bad cursor is an `INVALID_CURSOR` or a
   `CURSOR_SORT_MISMATCH`, and neither is the `INVALID_QUERY` everything that
   fails this schema becomes. An empty `?cursor=` is therefore a malformed
   cursor, not an absent one — unlike `q`, which a viewer clears by hand. */
const cursorToken = z.string().optional()

export const listUsersParamsSchema = userFilterParamsSchema.extend({
  sort: sortField,
  dir: sortDir,
  limit: pageLimit,
  cursor: cursorToken,
})

/** Everything the list endpoint needs: the shared predicate, plus the page. */
export type ListUsersParams = z.output<typeof listUsersParamsSchema>

/** Throws a `ZodError`, which the error middleware turns into a 400 `INVALID_QUERY`. */
export const parseListUsersParams = (query: unknown): ListUsersParams =>
  listUsersParamsSchema.parse(query)

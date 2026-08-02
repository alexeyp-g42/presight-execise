import { z } from 'zod'

/* The query string, decoded and validated into the params every filtered query
   is built from. This is the **one** module with unit tests: the wire's
   ambiguities all live here, and driving each of them through HTTP would be
   wasteful.
 *
 * Strict, unknown keys included. Validators strip unknown keys by default,
 * which is the worst available failure mode here — `?nationality=Turkey`
 * (singular) would return the *unfiltered* directory and look entirely
 * plausible. Rejecting turns a client-side typo into a 400 with the offending
 * key named. Safe to be this strict because the query string is built by the
 * client's own API module on the same origin. */

/* Empty means absent, not "match the empty string": a search box the viewer
   cleared has to return the whole directory, and `LIKE '%%'` matching everything
   only looks like the same thing until a cursor or a facet count is derived
   from it. Trimmed first, so a lone space is empty too. */
const searchTerm = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()

/* One repeated key arrives from `querystring.parse` as a bare string, several
   as an array — so `?hobbies=chess` and `?hobbies=chess&hobbies=judo` reach
   this schema as two different shapes of the same idea. Normalising both to an
   array here is what keeps that edge out of every consumer downstream.
 *
 * Deduplicated because a selection is a *set*. It matters more than it looks:
 * the ALL-of predicate compares `COUNT(DISTINCT hobby)` against the selection's
 * length, so `?hobbies=chess&hobbies=chess` would ask for two distinct hobbies
 * from a user who can only ever supply one, and quietly return nothing. */
const selection = z
  .union([z.string(), z.array(z.string())])
  .default([])
  .transform((value) => [...new Set(typeof value === 'string' ? [value] : value)])

/* Repeated keys rather than comma-joined values, which is not a style choice:
   nationality display names genuinely contain commas ("Korea, Republic of") and
   hobbies are free text, so a comma-joined value would silently split into two
   selections matching nothing — data-dependent and impossible to catch in
   review. Repeated keys are also what Express 5's `simple` parser produces
   natively; bracket syntax would yield a key literally named `hobbies[]`. */
export const userFilterParamsSchema = z.strictObject({
  q: searchTerm,
  hobbies: selection,
  nationalities: selection,
})

/** What every filtered query is built from — the list here, the facets in #21. */
export type UserFilterParams = z.output<typeof userFilterParamsSchema>

/* Throws a `ZodError`, which the error middleware turns into a 400
   `INVALID_QUERY` carrying one `{ field, message }` per problem. Express 5
   forwards it from the handler with no try/catch at the call site. */
export const parseUserFilterParams = (query: unknown): UserFilterParams =>
  userFilterParamsSchema.parse(query)

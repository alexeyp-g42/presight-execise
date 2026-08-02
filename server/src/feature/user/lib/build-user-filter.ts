import { and, inArray, type SQL, sql } from 'drizzle-orm'
import { user_hobbies, users } from '../../../shared/db/schema.ts'
import type { UserFilterParams } from '../schemas/user-filter-params.ts'
import { normalizeSearchText } from './normalize-search-text.ts'

/* One predicate builder, consumed by every query that filters: the list here,
   and the facet counts in #21 unchanged. That is the whole point — it is what
   stops the semantics drifting between what the list shows and what the sidebar
   claims clicking will do, and it is the axis the backend stack was chosen on.
   Prisma was rejected on exactly this: its facet path forces `$queryRaw`, so
   the predicate would have to be written twice in two languages.
 *
 * Hand-rolled SQL was rejected narrowly — Drizzle's `sql` template
 * auto-parameterises every interpolation, including `IN (?, ?)` over a
 * runtime-length array, so injection safety is mechanical here rather than a
 * matter of discipline. */

/** `undefined` when nothing is selected — an unfiltered query, not a `WHERE 1`. */
export const buildUserFilter = ({ q, hobbies, nationalities }: UserFilterParams): SQL | undefined =>
  and(matchesText(q), holdsEveryHobby(hobbies), holdsAnyNationality(nationalities))

/* `%` and `_` are LIKE's own wildcards, so a viewer typing either would widen
   their own search instead of narrowing it — `100_000` would match `100X000`.
   Escaped with a backslash declared through ESCAPE, which SQLite has no default
   for. The `'\\'` below is one backslash after the template literal is read. */
const escapeLikeWildcards = (term: string): string => term.replace(/[\\%_]/g, '\\$&')

/* Matched against `search_name` through the *same* `normalizeSearchText()` the
   seed wrote that column with, which is what makes `ozcan` find Özcan and
   `bjorn` find Bjørn. SQLite folds ASCII only — its `LIKE` and `COLLATE NOCASE`
   leave `Ö` and `o` as different characters — so without this the accented half
   of the directory would be unreachable by the name printed on its own card.
 *
 * The leading wildcard means no B-tree can serve this, by design: `search_name`
 * is deliberately unindexed and the scan is ~2-3ms at 25,000 rows. */
const matchesText = (q: string | undefined): SQL | undefined => {
  if (q === undefined) return undefined

  const term = escapeLikeWildcards(normalizeSearchText(q))

  return sql`${users.search_name} LIKE ${`%${term}%`} ESCAPE '\\'`
}

/* ALL-of: selecting a second hobby **narrows**, because a user must hold every
   one of them. Expressed as a grouped subquery rather than one `EXISTS` per
   selected hobby, so the SQL is the same shape whether one hobby is selected or
   six. `idx_user_hobbies_hobby` is `(hobby, user_id)` — the mirror of the
   primary key — so the `IN` and the `GROUP BY` are both served by that index
   without the table ever being touched.
 *
 * `COUNT(DISTINCT hobby)` rather than `COUNT(*)`: the primary key already makes
 * a user's hobbies distinct, but the count is compared against the *selection's*
 * length, and a selection is a set only because the validator deduplicates it.
 * DISTINCT means this stays correct on its own terms rather than on that one. */
const holdsEveryHobby = (hobbies: string[]): SQL | undefined =>
  hobbies.length === 0
    ? undefined
    : sql`${users.id} IN (
        SELECT ${user_hobbies.user_id}
        FROM ${user_hobbies}
        WHERE ${inArray(user_hobbies.hobby, hobbies)}
        GROUP BY ${user_hobbies.user_id}
        HAVING COUNT(DISTINCT ${user_hobbies.hobby}) = ${hobbies.length}
      )`

/* ANY-of: selecting a second nationality **widens**, because one of them is
   enough. A single column on `users`, so it is a plain `IN` served by
   `idx_users_nationality` — the same index that sorts the column and groups its
   facet. */
const holdsAnyNationality = (nationalities: string[]): SQL | undefined =>
  nationalities.length === 0 ? undefined : inArray(users.nationality, nationalities)

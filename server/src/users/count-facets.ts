import type { FacetEntry, FacetsResponse } from '@presight/shared'
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm'
import type { Db } from '../db/open-db.ts'
import { user_hobbies, users } from '../db/schema.ts'
import { buildUserFilter } from './build-user-filter.ts'
import type { UserFilterParams } from './user-filter-params.ts'

/* What the result set is *made of*: how many people match, which hobbies are
   common among them, and which nationalities they come from. Both aggregates
   and the count are built from `buildUserFilter` — the same predicate the list
   endpoint filters with, consumed unchanged. That is what stops the sidebar's
   counts drifting from the rows on screen, and it is why the predicate is a
   module rather than something each query spells out for itself.
 *
 * One handler for both facets rather than one endpoint each: the sidebar always
 * wants both, and both come off the same predicate. The `total` rides along for
 * the same reason — it is one `COUNT(*)` over a predicate already built here,
 * and it never recomputes while the viewer scrolls. */

/** Top 20 before pinning — the cut the long tail falls off. */
const FACET_LIMIT = 20

export const countFacets = (db: Db, params: UserFilterParams): FacetsResponse => {
  /* The asymmetric facet rule, and the whole of its implementation cost: the
     nationality facet is handed the params with its own selection emptied, so
     its counts read "adding this brings in *count* more". The hobby facet keeps
     its selection, so its counts read "adding this narrows you to *count*".
     Doing the same thing on both sides is wrong on one of them — keeping the
     nationality selection dead-ends the sidebar, since no unselected
     nationality could then ever appear; dropping the hobby selection advertises
     `hiking 120` when clicking hiking yields 5. */
  const withoutNationalitySelection: UserFilterParams = { ...params, nationalities: [] }

  return {
    total: countResultSet(db, params),
    hobbies: withPinnedSelections(topHobbies(db, params), params.hobbies, (values) =>
      hobbyCounts(db, params, values),
    ),
    nationalities: withPinnedSelections(
      topNationalities(db, withoutNationalitySelection),
      params.nationalities,
      (values) => nationalityCounts(db, withoutNationalitySelection, values),
    ),
  }
}

/* The size of the whole result set, not of the page — the list endpoint answers
   one page and cannot say how many rows stand behind it without a second query
   the client would then have to reconcile. */
const countResultSet = (db: Db, params: UserFilterParams): number =>
  db.select({ total: count() }).from(users).where(buildUserFilter(params)).get()?.total ?? 0

/* The hobby facet groups `user_hobbies` while the predicate is written against
   `users`, so the two tables are joined and `buildUserFilter` is dropped into
   the `WHERE` unchanged — which is the point of it being a module. The join is
   1:1 (`users.id` is unique and `(user_id, hobby)` is the primary key), so
   `count(*)` counts people, not rows.
 *
 * A join rather than `user_id IN (SELECT id FROM users WHERE …)`, which reads
 * more directly but measures worse: the `IN` form forces SQLite to drive from
 * the primary key and sort every hobby row into a temp B-tree for the GROUP BY,
 * where the join lets it scan `idx_user_hobbies_hobby` — `(hobby, user_id)`,
 * already in group order — and never touch the table. ~12ms against ~18ms
 * unfiltered at 25,000 users.
 *
 * The ALL-of predicate names `user_hobbies` in its own subquery, which the join
 * puts in scope twice. That resolves the way SQL scoping says it does — the
 * inner `FROM` shadows for the inner query only — and `count-facets.test.ts`
 * pins the behaviour with a hobby selection rather than leaving it to the
 * reader's confidence. */
const topHobbies = (db: Db, params: UserFilterParams): FacetEntry[] =>
  db
    .select({ value: user_hobbies.hobby, count: count() })
    .from(user_hobbies)
    .innerJoin(users, eq(users.id, user_hobbies.user_id))
    .where(buildUserFilter(params))
    .groupBy(user_hobbies.hobby)
    /* `value ASC` breaks the ties under SQLite's BINARY collation, so a facet
       response is byte-identical between two runs of the same query rather than
       ordered by whatever the grouping happened to emit. */
    .orderBy(desc(count()), asc(user_hobbies.hobby))
    .limit(FACET_LIMIT)
    .all()

const topNationalities = (db: Db, params: UserFilterParams): FacetEntry[] =>
  db
    .select({ value: users.nationality, count: count() })
    .from(users)
    .where(buildUserFilter(params))
    .groupBy(users.nationality)
    .orderBy(desc(count()), asc(users.nationality))
    .limit(FACET_LIMIT)
    .all()

/* The pinning queries: the same aggregate narrowed to the handful of values the
   cut missed, so a pinned entry carries a count the facet itself would have
   produced rather than one derived a second way. */
const hobbyCounts = (db: Db, params: UserFilterParams, values: string[]): FacetEntry[] =>
  db
    .select({ value: user_hobbies.hobby, count: count() })
    .from(user_hobbies)
    .innerJoin(users, eq(users.id, user_hobbies.user_id))
    .where(and(inArray(user_hobbies.hobby, values), buildUserFilter(params)))
    .groupBy(user_hobbies.hobby)
    .all()

const nationalityCounts = (db: Db, params: UserFilterParams, values: string[]): FacetEntry[] =>
  db
    .select({ value: users.nationality, count: count() })
    .from(users)
    .where(and(buildUserFilter(params), inArray(users.nationality, values)))
    .groupBy(users.nationality)
    .all()

/* No selection can be stranded. A value the viewer picked comes back whether or
   not it made the top 20, carrying its true count — `0` included, which is the
   case that matters: an empty result set produces no rows to group, so even a
   selected chess would vanish from its own facet and leave the viewer with no
   way back except reloading. The array is therefore `20 + k` long.
 *
 * The second query only runs when a selection actually missed the cut, which is
 * the uncommon case: a selected hobby is held by every user in the result set
 * by construction, so it lands at the maximum count and is cut only by an
 * alphabetical tie-break. */
const withPinnedSelections = (
  top: FacetEntry[],
  selection: string[],
  trueCounts: (values: string[]) => FacetEntry[],
): FacetEntry[] => {
  const alreadyOffered = new Set(top.map((entry) => entry.value))
  const missing = selection.filter((value) => !alreadyOffered.has(value))
  if (missing.length === 0) return top

  const counted = new Map(trueCounts(missing).map((entry) => [entry.value, entry.count]))

  return [
    ...top,
    ...missing
      .map((value): FacetEntry => ({ value, count: counted.get(value) ?? 0 }))
      .sort(byCountThenValue),
  ]
}

/* The facet's own ordering, applied to the pinned tail so the response does not
   depend on the order the query string happened to list the selection in.
   Compared with `<` rather than `localeCompare`, which is what keeps it the
   same ordering SQLite's BINARY collation gave the 20 above. */
const byCountThenValue = (left: FacetEntry, right: FacetEntry): number => {
  if (left.count !== right.count) return right.count - left.count
  if (left.value === right.value) return 0
  return left.value < right.value ? -1 : 1
}

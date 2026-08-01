import type { SortDir, SortField, User, UserListResponse } from '@presight/shared'
import { and, asc, desc, inArray, type SQL, sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { avatarPath } from '../avatars/avatar-path.ts'
import type { Db } from '../db/open-db.ts'
import { user_hobbies, users } from '../db/schema.ts'
import { buildUserFilter } from './build-user-filter.ts'
import { type ActiveSort, decodeCursor, encodeCursor } from './cursor.ts'
import type { ListUsersParams } from './list-users-params.ts'

/* Keyed by `SortField` from the contract package, so the four sort fields are
   stated once and this map cannot drift from them: adding a fifth field to
   `@presight/shared` is a compile error here until it has a column, which is
   also the moment it needs an index (`test/db/sort-indexes.test.ts` catches
   that half). */
const SORT_COLUMNS = {
  first_name: users.first_name,
  last_name: users.last_name,
  age: users.age,
  nationality: users.nationality,
} satisfies Record<SortField, AnySQLiteColumn>

/** A row carrying every sort field, so `row[sort]` is always a value. */
type SortableRow = { [Field in SortField]: string | number } & { id: number }

/* What a direction *means*, stated once and keyed by `SortDir`. The ordering
   and the seek are the same fact read twice — "descending walks the index
   backwards" and "descending seeks with `<`" — and holding one of them while
   flipping the other is precisely the bug that hands a caller a page they have
   already seen. Stated apart, nothing in the type system would object. */
const DIRECTION = {
  asc: { order: asc, beyond: sql.raw('>') },
  desc: { order: desc, beyond: sql.raw('<') },
} satisfies Record<SortDir, { order: typeof asc; beyond: SQL }>

export const listUsers = (db: Db, params: ListUsersParams): UserListResponse => {
  const { sort, dir, limit, cursor } = params
  /* Applied to the tie-breaker as well as to the sort field — `last_name DESC,
     id DESC`, never `last_name DESC, id ASC`. Both are deterministic; only this
     one lets a single `(sort_field, id)` index be walked in either direction,
     which is what keeps all 8 permutations free of a temp B-tree and lets
     `LIMIT` stop early instead of ordering the whole filtered set. */
  const { order } = DIRECTION[dir]

  const rows = db
    .select({
      id: users.id,
      first_name: users.first_name,
      last_name: users.last_name,
      age: users.age,
      nationality: users.nationality,
    })
    .from(users)
    .where(and(buildUserFilter(params), afterCursor(cursor, { sort, dir })))
    .orderBy(order(SORT_COLUMNS[sort]), order(users.id))
    /* One row more than the page: the extra row is what answers `has_more`, and
       it is discarded rather than returned. A second `COUNT` over the same
       predicate would be twice the work to settle a yes/no question. */
    .limit(limit + 1)
    .all()

  const page = rows.slice(0, limit)
  const hobbies = hobbiesByUser(
    db,
    page.map((row) => row.id),
  )

  /* `has_more` and `next_cursor` are one fact stated two ways, so both are read
     off a single expression rather than computed apart and trusted to agree. */
  const next_cursor = mintNextCursor(rows, params)

  return {
    users: page.map(
      (row): User => ({ ...row, avatar: avatarPath(row.id), hobbies: hobbies.get(row.id) ?? [] }),
    ),
    page_info: { has_more: next_cursor !== null, next_cursor },
  }
}

/* The next page starts after the last row of this one — which exists exactly
   when the extra row came back, since a row beyond the page can only follow a
   full page. `null` is therefore both "no more rows" and "no cursor". */
const mintNextCursor = (
  rows: SortableRow[],
  { sort, dir, limit }: ListUsersParams,
): string | null => {
  const last = rows.length > limit ? rows[limit - 1] : undefined

  return last === undefined ? null : encodeCursor({ sort, dir, value: last[sort], id: last.id })
}

/* The seek. A row-value comparison — `(last_name, id) > (?, ?)` — rather than
   the `a > ? OR (a = ? AND id > ?)` expansion it is equivalent to: SQLite turns
   the row-value form into a seek on `idx_users_<sort>` and walks forward from
   there, while the expanded form leaves it scanning.
 *
 * The pair is compared left to right, so `beyond` — `<` under a descending
 * sort — lands on exactly the rows the ordering puts after the cursor, which is
 * why it comes off `DIRECTION` beside the `ORDER BY` rather than being decided
 * again here.
 *
 * Read off the cursor rather than off the request, because `decodeCursor` has
 * already refused any cursor whose pair differs from the request's: these are
 * the request's sort and direction, proven rather than assumed. */
const afterCursor = (token: string | undefined, active: ActiveSort): SQL | undefined => {
  if (token === undefined) return undefined

  const cursor = decodeCursor(token, active)
  const { beyond } = DIRECTION[cursor.dir]

  return sql`(${SORT_COLUMNS[cursor.sort]}, ${users.id}) ${beyond} (${cursor.value}, ${cursor.id})`
}

/* One statement for the whole page rather than a query per card, and a separate
   statement rather than a join: joining would multiply every user by their
   hobby count and re-ship five copies of a name to be collapsed in memory
   anyway. The `ORDER BY` is free — `(user_id, hobby)` is the table's primary
   key, so the rows come off the B-tree already in it — and it is what makes
   `hobbies` alphabetical by contract rather than by luck. */
const hobbiesByUser = (db: Db, ids: number[]): Map<number, string[]> => {
  const grouped = new Map<number, string[]>(ids.map((id) => [id, []]))
  if (ids.length === 0) return grouped

  const rows = db
    .select()
    .from(user_hobbies)
    .where(inArray(user_hobbies.user_id, ids))
    .orderBy(asc(user_hobbies.user_id), asc(user_hobbies.hobby))
    .all()

  for (const { user_id, hobby } of rows) grouped.get(user_id)?.push(hobby)

  return grouped
}

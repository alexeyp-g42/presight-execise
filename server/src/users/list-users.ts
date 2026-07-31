import { DEFAULT_SORT, type SortField, type User, type UserListResponse } from '@presight/shared'
import { asc, inArray } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { avatarPath } from '../avatars/avatar-path.ts'
import type { Db } from '../db/open-db.ts'
import { user_hobbies, users } from '../db/schema.ts'
import { buildUserFilter } from './build-user-filter.ts'
import type { UserFilterParams } from './user-filter-params.ts'

/* The contract's default, applied here until #20 parameterises `sort`, `dir`,
   `limit` and `cursor`. Fetching one more row than the page is how `has_more`
   is answered without a second `COUNT` — the extra row is discarded. */
const PAGE_SIZE = 50

/* Keyed by `SortField` from the contract package, so the four sort fields are
   stated once and this map cannot drift from them: adding a fifth field to
   `@presight/shared` is a compile error here until it has a column, which is
   also the moment it needs an index (#20's query-plan seam catches that half). */
const SORT_COLUMNS = {
  first_name: users.first_name,
  last_name: users.last_name,
  age: users.age,
  nationality: users.nationality,
} satisfies Record<SortField, AnySQLiteColumn>

export const listUsers = (db: Db, params: UserFilterParams): UserListResponse => {
  const rows = db
    .select({
      id: users.id,
      first_name: users.first_name,
      last_name: users.last_name,
      age: users.age,
      nationality: users.nationality,
    })
    .from(users)
    .where(buildUserFilter(params))
    /* `id` tie-breaks in the sort's own direction, which is what lets four
       `(sort_field, id)` composites serve all 8 permutations with no temp
       B-tree. Ascending on both until #20 makes the direction a parameter. */
    .orderBy(asc(SORT_COLUMNS[DEFAULT_SORT]), asc(users.id))
    .limit(PAGE_SIZE + 1)
    .all()

  const page = rows.slice(0, PAGE_SIZE)
  const hobbies = hobbiesByUser(
    db,
    page.map((row) => row.id),
  )

  return {
    users: page.map(
      (row): User => ({ ...row, avatar: avatarPath(row.id), hobbies: hobbies.get(row.id) ?? [] }),
    ),
    page_info: {
      has_more: rows.length > PAGE_SIZE,
      /* Minted in #20, along with the `cursor` param that consumes it. */
      next_cursor: null,
    },
  }
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

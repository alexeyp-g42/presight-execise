import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { openDatabase, type Db } from '../src/db/connection.js'
import { seed } from '../src/db/seed.js'
import { parsePageRequest, type SortField, type SortOrder } from '../src/query/filters.js'
import { queryUsers } from '../src/query/users.js'

const USER_COUNT = 2000
const PAGE_SIZE = 37
const SORT_FIELDS: SortField[] = ['first_name', 'last_name', 'age', 'nationality']
const SORT_ORDERS: SortOrder[] = ['asc', 'desc']

const COMBINATIONS = SORT_FIELDS.flatMap((sort) =>
  SORT_ORDERS.map((order) => ({ sort, order })),
)

let dir: string
let db: Db

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'presight-pagination-'))
  db = openDatabase(join(dir, 'pagination.db'))
  seed(db, USER_COUNT)
})

afterAll(() => {
  db.close()
  rmSync(dir, { recursive: true, force: true })
})

const MAX_PAGES = Math.ceil(USER_COUNT / PAGE_SIZE) + 1

function walkAllPages(sort: SortField, order: SortOrder): number[] {
  const ids: number[] = []
  let cursor: string | null = null

  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex += 1) {
    const page = queryUsers(
      db,
      parsePageRequest({
        sort,
        order,
        limit: String(PAGE_SIZE),
        ...(cursor === null ? {} : { cursor }),
      }),
    )
    ids.push(...page.items.map((item) => item.id))
    if (!page.pageInfo.hasMore) {
      break
    }
    cursor = page.pageInfo.nextCursor
    expect(cursor).not.toBeNull()
  }

  return ids
}

function unpaginatedIds(sort: SortField, order: SortOrder): number[] {
  const direction = order === 'asc' ? 'ASC' : 'DESC'
  const rows = db
    .prepare(`SELECT id FROM users ORDER BY ${sort} ${direction}, id ${direction}`)
    .all() as Array<{ id: number }>
  return rows.map((row) => row.id)
}

describe('keyset pagination over a seeded database', () => {
  it.each(COMBINATIONS)(
    'returns every user exactly once when sorted by $sort $order',
    ({ sort, order }) => {
      const walked = walkAllPages(sort, order)

      expect(new Set(walked).size).toBe(USER_COUNT)
      expect(walked).toHaveLength(USER_COUNT)
      expect(walked).toEqual(unpaginatedIds(sort, order))
    },
  )
})

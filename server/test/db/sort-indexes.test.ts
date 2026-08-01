import { SORT_DIRS, SORT_FIELDS, type SortField } from '@presight/shared'
import { type SQL, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMigratedDatabase, type MigratedDatabase } from '../support/temp-database.ts'

/* Server seam 2, and the one thing in the suite that is not reachable through
   HTTP: the four composite indexes exist to serve all 8 sort permutations with
   no temp B-tree, so `LIMIT` can stop early instead of sorting the whole
   filtered set. That is a claim about the query planner, and `sqlite_master`
   cannot settle it — this asks SQLite directly.

   The permutations are read from `@presight/shared` rather than restated here,
   which is what makes the guarantee hold going forward: add a fifth sort field
   to the contract without an index for it and this fails. */

let database: MigratedDatabase

beforeAll(() => {
  database = createMigratedDatabase()
})

afterAll(() => {
  database.close()
})

const planFor = (query: SQL): string =>
  database.db
    .all<{ detail: string }>(sql`EXPLAIN QUERY PLAN ${query}`)
    .map((step) => step.detail)
    .join('\n')

const PAGE = sql.raw('SELECT id, first_name, last_name, age, nationality FROM users')

/* `id` tie-breaks in the sort's own direction — that is what lets one index be
   walked either way instead of needing four more. */
const orderedBy = (field: string, dir: string): SQL =>
  sql.raw(`ORDER BY ${field} ${dir}, id ${dir} LIMIT 50`)

/* Unfiltered, so no optimiser choice about *which* index to use can make this
   flaky — the only question asked is whether the ordering is index-served. */
describe('sorting is served by an index in both directions', () => {
  for (const field of SORT_FIELDS) {
    for (const dir of SORT_DIRS) {
      it(`ORDER BY ${field} ${dir}, id ${dir} walks idx_users_${field}`, () => {
        const plan = planFor(sql`${PAGE} ${orderedBy(field, dir)}`)

        expect(plan).toContain(`USING INDEX idx_users_${field}`)
        expect(plan).not.toMatch(/TEMP B-TREE/i)
      })
    }
  }
})

/* Bound to a value of the column's own type. Text against `age` would be
   compared under integer affinity, which is a different question than the one
   this file asks — and one `decodeCursor` refuses outright. */
const CURSOR_VALUE = {
  first_name: 'Marta',
  last_name: 'Marchetti',
  age: 40,
  nationality: 'Norway',
} satisfies Record<SortField, string | number>

/* The other half of the keyset argument, and the reason it was chosen over
   offset: the composites the sort already needs are exactly the index a
   row-value comparison seeks on, so the expensive prerequisite was paid by an
   earlier decision. `SEARCH` rather than `SCAN` is the whole claim — SQLite
   jumps straight to the cursor's row instead of walking the index from the
   start and discarding everything it passes.
 *
 * The `a > ? OR (a = ? AND id > ?)` expansion is what this guards against: it
 * returns the same rows, it is the form most people reach for, and SQLite
 * cannot turn it into a seek. */
describe('the keyset seek is served by the same index', () => {
  for (const field of SORT_FIELDS) {
    for (const dir of SORT_DIRS) {
      const beyond = sql.raw(dir === 'asc' ? '>' : '<')

      it(`(${field}, id) ${dir === 'asc' ? '>' : '<'} (?, ?) seeks idx_users_${field}`, () => {
        const after = sql`WHERE (${sql.raw(field)}, id) ${beyond} (${CURSOR_VALUE[field]}, ${30})`
        const plan = planFor(sql`${PAGE} ${after} ${orderedBy(field, dir)}`)

        expect(plan).toContain('SEARCH users USING')
        expect(plan).toContain(`INDEX idx_users_${field}`)
        expect(plan).not.toMatch(/TEMP B-TREE/i)
      })
    }
  }
})

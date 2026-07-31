import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMigratedDatabase, type MigratedDatabase } from '../support/temp-database.ts'

/* The four composite indexes exist to serve all 8 sort permutations with no
   temp B-tree, so `LIMIT` can stop early instead of sorting the whole filtered
   set. That is a claim about the query planner, and `sqlite_master` cannot
   settle it — this asks SQLite directly.

   Add a fifth sort field without an index and this fails. */

const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const
const SORT_DIRS = ['asc', 'desc'] as const

let database: MigratedDatabase

beforeAll(() => {
  database = createMigratedDatabase()
})

afterAll(() => {
  database.close()
})

/* Unfiltered, so no optimiser choice about *which* index to use can make this
   flaky — the only question asked is whether the ordering is index-served. */
const planFor = (field: string, dir: string) =>
  database.db
    .all<{ detail: string }>(
      sql.raw(
        `EXPLAIN QUERY PLAN
         SELECT id, first_name, last_name, age, nationality FROM users
         ORDER BY ${field} ${dir}, id ${dir} LIMIT 50`,
      ),
    )
    .map((step) => step.detail)
    .join('\n')

describe('sorting is served by an index in both directions', () => {
  for (const field of SORT_FIELDS) {
    for (const dir of SORT_DIRS) {
      /* `id` tie-breaks in the sort's own direction — that is what lets one
         index be walked either way instead of needing four more. */
      it(`ORDER BY ${field} ${dir}, id ${dir} walks idx_users_${field}`, () => {
        const plan = planFor(field, dir)

        expect(plan).toContain(`USING INDEX idx_users_${field}`)
        expect(plan).not.toMatch(/TEMP B-TREE/i)
      })
    }
  }
})

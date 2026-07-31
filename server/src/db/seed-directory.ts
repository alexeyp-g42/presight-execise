import { sql } from 'drizzle-orm'
import { migrate } from './migrate.ts'
import type { Db } from './open-db.ts'
import { user_hobbies, users } from './schema.ts'
import { DEFAULT_USER_COUNT, generateDataset } from './seed-dataset.ts'

/* SQLite caps a statement at 32,766 bound parameters. `users` binds 6 per row
   and `user_hobbies` 2, so these leave room to spare while still cutting 25,000
   users down to 50 statements. */
const USER_CHUNK = 500
const HOBBY_CHUNK = 2_000

const chunked = <T>(rows: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let start = 0; start < rows.length; start += size) {
    chunks.push(rows.slice(start, start + size))
  }
  return chunks
}

export type SeedSummary = {
  users: number
  hobbies: number
}

/* Self-sufficient and truncating: it migrates whatever it is handed, throws the
   previous dataset away, writes the new one and leaves the planner fresh
   statistics. That is what lets the container entrypoint run it before the
   server has ever booted, against a volume with no tables in it, and what lets
   anyone run it twice without a `--force` flag or a row-count guard — a second
   run silently doing nothing is surprising, and leaves no way to reseed short
   of deleting the file.
 *
 * Migration is the one step outside the transaction, because Drizzle's
 * migrator issues its own `BEGIN`/`COMMIT` and SQLite has no nested
 * transactions. It is already atomic and idempotent on its own, and it is
 * additive — the destructive half, where a partial write would leave half a
 * directory behind, is the part wrapped below. */
export const seedDirectory = (
  db: Db,
  { userCount = DEFAULT_USER_COUNT }: { userCount?: number } = {},
): SeedSummary => {
  migrate(db)

  const dataset = generateDataset({ userCount })

  db.transaction((tx) => {
    /* Explicit rather than leaning on the foreign key's cascade: the cascade is
       there to stop a hobby row outliving its user, not to be the seed's
       delete plan, and reading `delete both tables` beats reading `delete one
       and know what the schema does`. */
    tx.delete(user_hobbies).run()
    tx.delete(users).run()

    for (const chunk of chunked(dataset.users, USER_CHUNK)) {
      tx.insert(users).values(chunk).run()
    }
    for (const chunk of chunked(dataset.hobbies, HOBBY_CHUNK)) {
      tx.insert(user_hobbies).values(chunk).run()
    }

    /* Inside the transaction so the statistics can never describe a dataset
       other than the one that was just committed. Without it the planner meets
       25,000 rows with no idea of their shape and can pick a scan over the
       facet indexes. */
    tx.run(sql`ANALYZE`)
  })

  return { users: dataset.users.length, hobbies: dataset.hobbies.length }
}

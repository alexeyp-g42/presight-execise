import { openDb } from './open-db.ts'
import { DEFAULT_USER_COUNT } from './seed-dataset.ts'
import { seedDirectory } from './seed-directory.ts'

/* `pnpm seed`, and the command the container entrypoint runs before the server
   boots. This path is pinned: the entrypoint invokes the compiled
   `dist/db/seed.js` directly, so moving this file means editing the entrypoint.

   It stays a thin shell over `seedDirectory` — environment in, exit code out —
   because everything worth testing about the dataset is testable without a
   process, and the only thing worth testing about *this* file is the exit
   code. */

const parseUserCount = (raw: string | undefined): number => {
  if (raw === undefined) return DEFAULT_USER_COUNT

  const userCount = Number(raw)
  /* A garbage count is a failed seed, not a silent correction: seeding zero
     users and exiting 0 would hand the server an empty directory and log
     success while doing it. */
  if (!Number.isInteger(userCount) || userCount < 1) {
    throw new Error(`SEED_USER_COUNT must be a positive integer — got '${raw}'`)
  }

  return userCount
}

try {
  const userCount = parseUserCount(process.env.SEED_USER_COUNT)
  const db = openDb()

  const summary = seedDirectory(db, { userCount })

  /* Closing checkpoints the WAL back into the file, so what the seed leaves on
     the volume is a database rather than a database plus a pending sidecar. */
  db.$client.close()
  console.log(`seeded ${summary.users} users and ${summary.hobbies} hobby rows`)
} catch (error) {
  /* Non-zero, so the entrypoint stops here rather than booting a server onto a
     database that was never filled. */
  console.error('seed failed:', error instanceof Error ? error.message : error)
  process.exit(1)
}

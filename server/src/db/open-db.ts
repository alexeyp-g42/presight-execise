import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.ts'

/* Where the container mounts its named volume. The database is the one piece of
   state that has to survive `docker compose down`, so it lives outside the
   image rather than beside the code. */
export const DEFAULT_DATABASE_PATH = '/data/presight.sqlite'

export type Db = ReturnType<typeof openDb>

/* The only place a connection is opened. Everything downstream — the server,
   the seed, and the test harness — goes through it, so the pragmas below cannot
   be set on one path and forgotten on another. */
export const openDb = (path = process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH) => {
  const file = resolve(path)
  /* The seed runs before the server on a first boot, against a volume that is
     an empty directory or nothing at all. */
  mkdirSync(dirname(file), { recursive: true })

  const client = new Database(file)
  /* WAL so a reader is never blocked by the seed's write transaction. */
  client.pragma('journal_mode = WAL')
  /* Off by default in SQLite, and the schema's one foreign key is what stops a
     hobby row outliving its user. */
  client.pragma('foreign_keys = ON')
  /* Five seconds of retry instead of an immediate SQLITE_BUSY, which is what a
     request would otherwise get if it landed mid-seed. */
  client.pragma('busy_timeout = 5000')

  return drizzle(client, { schema })
}

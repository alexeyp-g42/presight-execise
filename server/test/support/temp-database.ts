import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrate } from '../../src/db/migrate.ts'
import { openDb, type Db } from '../../src/db/open-db.ts'

export type TempDatabase = {
  /** Path to a database file inside a fresh directory. The file does not exist yet. */
  path: string
  /** Removes the directory and everything WAL left beside the file. */
  remove: () => void
}

/* A temp *file*, never `:memory:`. It exercises the same open → migrate → seed
   path the container uses, and WAL — which the in-memory driver quietly
   ignores — is one of the things `openDb()` is asserted to set. */
export const createTempDatabase = (): TempDatabase => {
  const dir = mkdtempSync(join(tmpdir(), 'presight-test-'))

  return {
    path: join(dir, 'presight.sqlite'),
    remove: () => rmSync(dir, { recursive: true, force: true }),
  }
}

export type MigratedDatabase = {
  db: Db
  /** Closes the handle and takes the directory with it. */
  close: () => void
}

/* Open → migrate → hand back, through the app's own modules rather than a
   test-only copy of the schema: a fixture built against DDL the server does not
   actually run would pass while production is broken. `openDb` is the one
   exception — its own tests build the steps by hand, since it is what they are
   asserting. */
export const createMigratedDatabase = (): MigratedDatabase => {
  const temp = createTempDatabase()
  const db = openDb(temp.path)
  migrate(db)

  return {
    db,
    close: () => {
      db.$client.close()
      temp.remove()
    },
  }
}

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

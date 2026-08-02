import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate as applyMigrations } from 'drizzle-orm/better-sqlite3/migrator'
import type { Db } from './open-db.ts'

/* `<package>/drizzle` from both `src/shared/db` and the compiled
   `dist/shared/db`, so the type-stripped dev loop, the test suite and the
   runtime image all read the same committed SQL. Resolved from
   `import.meta.url` rather than the process's working directory, because the
   container runs `node dist/index.js` from wherever the entrypoint happens to
   leave it — which also means the number of `..` here is this file's depth in
   the tree, and moving it means counting again. */
const MIGRATIONS_FOLDER = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'drizzle',
)

/* Runs on boot, every boot. Drizzle records each applied migration's hash, so a
   second boot against a populated volume is a no-op rather than a re-run — the
   property the container depends on, since it has no way to know whether the
   volume it just mounted is new. */
export const migrate = (db: Db): void => {
  applyMigrations(db, { migrationsFolder: MIGRATIONS_FOLDER })
}

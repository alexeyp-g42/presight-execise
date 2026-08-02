import { expect, vi } from 'vitest'
import type { Db } from '../../src/shared/db/open-db.ts'

/* Asserted at the driver rather than at any layer above it, so a query added
   through Drizzle, through raw SQL, or through a module that only reaches for
   `app.locals.db` trips it just the same.

   Two routes are defined by not querying, for different reasons — `/api/health`
   because a database-touching liveness check reports an unseeded container and
   a broken one identically, `/api/avatars/:id.svg` because the id is the
   generator's seed and not a lookup key — and both are asserted the same way.

   The caller restores the spies; every suite using this already runs
   `vi.restoreAllMocks()` in an `afterEach`. */
export const expectNoDatabaseQuery = async (db: Db, work: () => Promise<unknown>) => {
  const prepare = vi.spyOn(db.$client, 'prepare')
  const exec = vi.spyOn(db.$client, 'exec')
  const pragma = vi.spyOn(db.$client, 'pragma')

  await work()

  expect(prepare).not.toHaveBeenCalled()
  expect(exec).not.toHaveBeenCalled()
  expect(pragma).not.toHaveBeenCalled()
}

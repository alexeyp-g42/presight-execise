import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { migrate } from '../../src/db/migrate.ts'
import { DEFAULT_DATABASE_PATH, openDb } from '../../src/db/open-db.ts'
import { users } from '../../src/db/schema.ts'
import { createTempDatabase } from '../support/temp-database.ts'

/* Every test here opens its own database, so cleanup is per-test rather than
   per-file: `openDb` is the thing under test and half of what it does happens
   at open time. */
let cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups) cleanup()
  cleanups = []
  vi.unstubAllEnvs()
})

const openTemp = () => {
  const temp = createTempDatabase()
  const db = openDb(temp.path)
  cleanups.push(() => {
    db.$client.close()
    temp.remove()
  })
  return { db, path: temp.path }
}

const fixtureUser = {
  id: 1,
  first_name: 'Ada',
  last_name: 'Lovelace',
  age: 36,
  nationality: 'United Kingdom',
  search_name: 'ada lovelace',
}

describe('openDb', () => {
  it('opens the file it is given, creating the parent directory', () => {
    const temp = createTempDatabase()
    const nested = join(temp.path, '..', 'data', 'presight.sqlite')

    const db = openDb(nested)
    cleanups.push(() => {
      db.$client.close()
      temp.remove()
    })

    expect(existsSync(nested)).toBe(true)
  })

  it('sets WAL, foreign keys and a busy timeout', () => {
    const { db } = openTemp()

    expect(db.$client.pragma('journal_mode', { simple: true })).toBe('wal')
    expect(db.$client.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(db.$client.pragma('busy_timeout', { simple: true })).toBe(5000)
  })

  it('reads DATABASE_PATH when called with no argument', () => {
    const temp = createTempDatabase()
    vi.stubEnv('DATABASE_PATH', temp.path)

    const db = openDb()
    cleanups.push(() => {
      db.$client.close()
      temp.remove()
    })

    expect(existsSync(temp.path)).toBe(true)
  })

  it('falls back to the path the container mounts its volume at', () => {
    expect(DEFAULT_DATABASE_PATH).toBe('/data/presight.sqlite')
  })
})

describe('migrate', () => {
  it('applies the committed migrations to an empty file', () => {
    const { db } = openTemp()

    migrate(db)

    expect(db.select().from(users).all()).toEqual([])
  })

  /* The container boots against a volume that survives restarts, so this runs
     on every single boot after the first. */
  it('is idempotent — a second boot against the same file keeps the data', () => {
    const temp = createTempDatabase()
    const first = openDb(temp.path)
    migrate(first)
    first.insert(users).values(fixtureUser).run()
    first.$client.close()

    const second = openDb(temp.path)
    cleanups.push(() => {
      second.$client.close()
      temp.remove()
    })

    expect(() => migrate(second)).not.toThrow()
    expect(second.select().from(users).all()).toEqual([fixtureUser])
  })

  it('records the migration once, however many times it runs', () => {
    const { db } = openTemp()

    migrate(db)
    migrate(db)

    const applied = db.all<{ count: number }>(
      sql`SELECT count(*) AS count FROM __drizzle_migrations`,
    )
    expect(applied).toEqual([{ count: 1 }])
  })
})

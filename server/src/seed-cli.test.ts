import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDatabase, type TempDatabase } from '../test/support/temp-database.ts'
import { openDb } from './shared/db/open-db.ts'

/* The seam the container entrypoint uses: a process, an environment, and an
   exit code. `src/seed.ts` is a pinned path — the entrypoint invokes its
   compiled form directly, so moving the file means editing the entrypoint. */
const SEED_SCRIPT = join(import.meta.dirname, 'seed.ts')

let temp: TempDatabase | undefined

afterEach(() => {
  temp?.remove()
  temp = undefined
})

const runSeed = (env: Record<string, string>) =>
  spawnSync(process.execPath, [SEED_SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })

describe('pnpm seed', () => {
  it('seeds the database at DATABASE_PATH and exits 0', () => {
    temp = createTempDatabase()

    const result = runSeed({ DATABASE_PATH: temp.path, SEED_USER_COUNT: '40' })

    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)

    const db = openDb(temp.path)
    const [count] = db.all<{ count: number }>(sql`SELECT count(*) AS count FROM users`)
    db.$client.close()
    expect(count).toEqual({ count: 40 })
  })

  /* Non-zero, so the container entrypoint stops rather than booting a server
     onto a database that was never filled. */
  it('exits non-zero when the database cannot be opened', () => {
    const result = runSeed({
      DATABASE_PATH: '/dev/null/there-is-no-directory-here/presight.sqlite',
      SEED_USER_COUNT: '10',
    })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/seed failed/i)
  })

  /* A garbage count is a failed seed, not a silent correction — the same rule
     the server applies to PORT, and the same rule the API applies to a bad
     query param. */
  it('refuses a SEED_USER_COUNT that is not a positive integer', () => {
    temp = createTempDatabase()

    const result = runSeed({ DATABASE_PATH: temp.path, SEED_USER_COUNT: 'lots' })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/SEED_USER_COUNT/)
  })
})

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../src/db/connection.js'
import { seed } from '../src/db/seed.js'
import { HOBBIES } from '../src/db/vocabulary.js'

describe('seed', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'presight-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('inserts the requested number of users', () => {
    const db = openDatabase(join(dir, 'test.db'))
    seed(db, 500)
    const row = db.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number }

    expect(row.total).toBe(500)
  })

  it('inserts the full hobby vocabulary', () => {
    const db = openDatabase(join(dir, 'test.db'))
    seed(db, 500)
    const row = db.prepare('SELECT COUNT(*) AS total FROM hobbies').get() as { total: number }

    expect(row.total).toBe(HOBBIES.length)
  })

  it('gives every user between 0 and 10 hobbies', () => {
    const db = openDatabase(join(dir, 'test.db'))
    seed(db, 500)
    const row = db
      .prepare(
        'SELECT MAX(c) AS most FROM (SELECT COUNT(*) AS c FROM user_hobbies GROUP BY user_id)',
      )
      .get() as { most: number }

    expect(row.most).toBeLessThanOrEqual(10)
  })

  it('produces at least one user with more than two hobbies', () => {
    const db = openDatabase(join(dir, 'test.db'))
    seed(db, 500)
    const row = db
      .prepare(
        'SELECT COUNT(*) AS many FROM (SELECT user_id FROM user_hobbies GROUP BY user_id HAVING COUNT(*) > 2)',
      )
      .get() as { many: number }

    expect(row.many).toBeGreaterThan(0)
  })

  it('is deterministic for a fixed seed', () => {
    const first = openDatabase(join(dir, 'a.db'))
    const second = openDatabase(join(dir, 'b.db'))
    seed(first, 100)
    seed(second, 100)

    const nameOf = (db: ReturnType<typeof openDatabase>) =>
      (db.prepare('SELECT first_name FROM users WHERE id = 50').get() as { first_name: string })
        .first_name

    expect(nameOf(first)).toBe(nameOf(second))
  })
})

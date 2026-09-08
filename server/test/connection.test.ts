import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hasData, openDatabase } from '../src/db/connection.js'

describe('openDatabase', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'presight-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('creates the three tables', () => {
    const db = openDatabase(join(dir, 'test.db'))
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name)

    expect(names).toContain('users')
    expect(names).toContain('hobbies')
    expect(names).toContain('user_hobbies')
  })

  it('creates one index per sort field', () => {
    const db = openDatabase(join(dir, 'test.db'))
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'")
      .all()
      .map((row) => (row as { name: string }).name)

    expect(names).toEqual(
      expect.arrayContaining([
        'idx_users_first_name',
        'idx_users_last_name',
        'idx_users_age',
        'idx_users_nationality',
        'idx_user_hobbies_hobby',
      ]),
    )
  })

  it('is idempotent across reopens', () => {
    const path = join(dir, 'test.db')
    openDatabase(path).close()

    expect(() => openDatabase(path)).not.toThrow()
  })

  it('reports an empty database as having no data', () => {
    const db = openDatabase(join(dir, 'test.db'))

    expect(hasData(db)).toBe(false)
  })

  it('reports a populated database as having data', () => {
    const db = openDatabase(join(dir, 'test.db'))
    db.prepare(
      "INSERT INTO users (avatar, first_name, last_name, age, nationality) VALUES ('a', 'Ada', 'Byron', 36, 'British')",
    ).run()

    expect(hasData(db)).toBe(true)
  })
})

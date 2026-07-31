import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { openDb } from '../../src/db/open-db.ts'
import { migrate } from '../../src/db/migrate.ts'
import { user_hobbies, users } from '../../src/db/schema.ts'
import { createTempDatabase, type TempDatabase } from '../support/temp-database.ts'

/* These assert the *applied* schema, not the TypeScript declaration — the
   committed SQL is what the container runs, and one clause in it (WITHOUT
   ROWID) cannot be expressed in the schema module at all. */

let temp: TempDatabase
let db: ReturnType<typeof openDb>

beforeAll(() => {
  temp = createTempDatabase()
  db = openDb(temp.path)
  migrate(db)
})

afterAll(() => {
  db.$client.close()
  temp.remove()
})

const columnsOf = (table: string) =>
  db
    .all<{ name: string }>(sql`SELECT name FROM pragma_table_info(${table})`)
    .map((column) => column.name)

const indexesOf = (table: string) =>
  db.all<{ name: string; sql: string | null }>(
    sql`SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ${table} ORDER BY name`,
  )

describe('users', () => {
  it('carries the denormalised directory row, search_name included', () => {
    expect(columnsOf('users')).toEqual([
      'id',
      'first_name',
      'last_name',
      'age',
      'nationality',
      'search_name',
    ])
  })

  /* Four indexes, one per sort field, each `(sort_field, id)`. `id` tie-breaks
     in the sort's own direction, so SQLite walks each of these in either
     direction and all 8 sort permutations are served with no temp B-tree. */
  it('has one (sort_field, id) composite index per sort field', () => {
    const indexes = indexesOf('users')

    expect(indexes.map((index) => index.name)).toEqual([
      'idx_users_age',
      'idx_users_first_name',
      'idx_users_last_name',
      'idx_users_nationality',
    ])
    for (const { name, sql: ddl } of indexes) {
      expect(`${name}: ${ddl}`).toMatch(/`id`\)$/)
    }
  })

  /* A leading wildcard cannot use a B-tree under any strategy, so an index here
     would be pure cost that reads as if it were doing something. */
  it('leaves search_name unindexed', () => {
    expect(indexesOf('users').filter((index) => index.sql?.includes('search_name'))).toEqual([])
  })
})

describe('user_hobbies', () => {
  it('holds the hobby name directly, keyed by (user_id, hobby)', () => {
    expect(columnsOf('user_hobbies')).toEqual(['user_id', 'hobby'])
    expect(
      db
        .all<{ name: string }>(sql`SELECT name FROM pragma_table_info('user_hobbies') WHERE pk > 0`)
        .map((column) => column.name),
    ).toEqual(['user_id', 'hobby'])
  })

  it('is WITHOUT ROWID, so the primary key is the table rather than a copy of it', () => {
    const [table] = db.all<{ sql: string }>(
      sql`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'user_hobbies'`,
    )

    expect(table?.sql).toMatch(/WITHOUT ROWID/i)
    /* The behavioural half: a WITHOUT ROWID table has no rowid to select. */
    expect(() => db.all(sql`SELECT rowid FROM user_hobbies`)).toThrow(/no such column/i)
  })

  it('indexes (hobby, user_id) as the mirror of the primary key', () => {
    expect(indexesOf('user_hobbies').map((index) => index.name)).toEqual([
      'idx_user_hobbies_hobby',
    ])
  })

  it('enforces its foreign key, because openDb turned foreign keys on', () => {
    expect(() =>
      db.insert(user_hobbies).values({ user_id: 404, hobby: 'chess' }).run(),
    ).toThrow(/FOREIGN KEY constraint failed/i)
  })

  it('cascades a deleted user to their hobbies', () => {
    db.insert(users)
      .values({
        id: 7,
        first_name: 'Alan',
        last_name: 'Turing',
        age: 41,
        nationality: 'United Kingdom',
        search_name: 'alan turing',
      })
      .run()
    db.insert(user_hobbies).values({ user_id: 7, hobby: 'running' }).run()

    db.delete(users).run()

    expect(db.select().from(user_hobbies).all()).toEqual([])
  })
})

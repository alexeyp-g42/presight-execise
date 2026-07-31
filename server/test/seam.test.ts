import { describe, expect, it } from 'vitest'
import { users } from '../src/db/schema.ts'
import { createTestServer } from './support/test-server.ts'

/* Seam 1's own guarantees, asserted once here so every later server ticket can
   build on them without re-proving them: the fixture reaches the database the
   app queries, and one test file's data cannot leak into another's. */

const ada = {
  id: 1,
  first_name: 'Ada',
  last_name: 'Lovelace',
  age: 36,
  nationality: 'United Kingdom',
  search_name: 'ada lovelace',
}

const seeded = createTestServer({
  seed: (db) => {
    db.insert(users).values(ada).run()
  },
})

const empty = createTestServer()

describe('the server test seam', () => {
  it('inserts the fixture into the database the app was built with', () => {
    expect(seeded.db.select().from(users).all()).toEqual([ada])
  })

  it('gives each server its own file, so fixtures never bleed between them', () => {
    expect(empty.db.select().from(users).all()).toEqual([])
  })
})

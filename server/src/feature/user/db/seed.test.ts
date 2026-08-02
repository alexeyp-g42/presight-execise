import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createUnmigratedDatabase } from '../../../../test/support/temp-database.ts'
import type { Db } from '../../../shared/db/open-db.ts'
import { normalizeSearchText } from '../lib/normalize-search-text.ts'
import { DEFAULT_USER_COUNT } from './seed-dataset.ts'
import { seedDirectory } from './seed-directory.ts'
import { HOBBIES, NATIONALITIES } from './seed-vocabulary.ts'

/* Every test here seeds its own database, because seeding is the thing under
   test and the first thing it does is migrate a file that has no tables. */
let cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups) cleanup()
  cleanups = []
})

const openUnmigrated = (): Db => {
  const { db, close } = createUnmigratedDatabase()
  cleanups.push(close)
  return db
}

const countOf = (db: Db, statement: ReturnType<typeof sql>): number =>
  db.get<{ count: number }>(statement).count

describe('seedDirectory', () => {
  /* The container entrypoint seeds *before* the server boots, so on a first
     `docker compose up` the volume is an empty directory and nothing has ever
     created a table in it. */
  it('migrates and fills a database file that has no tables yet', () => {
    const db = openUnmigrated()

    seedDirectory(db, { userCount: 200 })

    expect(countOf(db, sql`SELECT count(*) AS count FROM users`)).toBe(200)
  })
})

/* The default dataset, seeded once and read by everything below it. A full
   25,000-user seed is under a second, so these assert the directory the
   container actually ships rather than a miniature standing in for it. */
describe('the seeded directory', () => {
  let db: Db
  let close: () => void

  beforeAll(() => {
    const opened = createUnmigratedDatabase()
    db = opened.db
    close = opened.close
    seedDirectory(db)
  })

  afterAll(() => close())

  it('holds 25,000 users drawn from 80 hobbies and 50 nationalities', () => {
    expect(HOBBIES).toHaveLength(80)
    expect(NATIONALITIES).toHaveLength(50)
    expect(DEFAULT_USER_COUNT).toBe(25_000)

    expect(countOf(db, sql`SELECT count(*) AS count FROM users`)).toBe(25_000)
    expect(countOf(db, sql`SELECT count(DISTINCT hobby) AS count FROM user_hobbies`)).toBe(80)
    expect(countOf(db, sql`SELECT count(DISTINCT nationality) AS count FROM users`)).toBe(50)
  })

  it('spans 0 to 10 hobbies per user, with both extremes really in the data', () => {
    const spread = db.all<{ hobby_count: number; users: number }>(sql`
      SELECT hobby_count, count(*) AS users FROM (
        SELECT u.id, count(h.hobby) AS hobby_count
        FROM users u LEFT JOIN user_hobbies h ON h.user_id = u.id
        GROUP BY u.id
      ) GROUP BY hobby_count ORDER BY hobby_count
    `)

    /* Every count from 0 to 10 and nothing outside it. The two ends are the
       ones with a card to render: 0 is the empty card, 10 is the `+8`. */
    expect(spread.map((row) => row.hobby_count)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(spread[0]!.users).toBeGreaterThan(100)
    expect(spread[10]!.users).toBeGreaterThan(100)
    /* The bulge the weights aim at: the middle of the range carries the mass. */
    const middle = spread.slice(2, 6).reduce((total, row) => total + row.users, 0)
    expect(middle).toBeGreaterThan(DEFAULT_USER_COUNT / 2)
  })

  it('keeps every age inside 18 to 75', () => {
    const [range] = db.all<{ youngest: number; oldest: number }>(
      sql`SELECT min(age) AS youngest, max(age) AS oldest FROM users`,
    )

    expect(range).toEqual({ youngest: 18, oldest: 75 })
  })

  /* The payoff of drawing names from each nationality's own locale: a user from
     Turkey is not called John Smith, and the normalisation is exercised by a
     fifth of the directory rather than by a handful of planted rows. */
  it('draws genuinely non-ASCII names from the nationality locales', () => {
    const nonAscii = db
      .all<{ first_name: string; last_name: string }>(
        sql`SELECT first_name, last_name FROM users`,
      )
      .filter((row) => !/^[ -~]*$/.test(`${row.first_name} ${row.last_name}`))

    expect(nonAscii.length).toBeGreaterThan(DEFAULT_USER_COUNT / 10)
  })

  it('stores search_name as the normalised first + last of every row', () => {
    const rows = db.all<{ first_name: string; last_name: string; search_name: string }>(
      sql`SELECT first_name, last_name, search_name FROM users`,
    )

    const wrong = rows.filter(
      (row) => row.search_name !== normalizeSearchText(`${row.first_name} ${row.last_name}`),
    )
    expect(wrong).toEqual([])

    /* And the fold map covers the whole dataset, not just its own unit tests:
       a row whose normalised form still held a letter an ASCII keyboard cannot
       type would sit in the directory unreachable by search. */
    expect(rows.filter((row) => !/^[ -~]*$/.test(row.search_name))).toEqual([])
  })

  /* The whole reason the dataset is this size and this shape. A flat
     distribution would make the sidebar's top-20 an arbitrary slice, and a
     dataset a tenth of this one collapses the deep-filter case into a wall of
     1s — the counts have to stay meaningful after selections stack, not merely
     globally. */
  describe('Zipf weighting', () => {
    /* The hobby facet keeps its own selection, because hobbies are ALL-of and
       each count reads "adding this leaves you *count* people". */
    const hobbyFacet = (selected: string[]) =>
      db.all<{ value: string; count: number }>(sql`
        SELECT hobby AS value, count(*) AS count FROM user_hobbies
        ${
          selected.length === 0
            ? sql``
            : sql`WHERE user_id IN (
                SELECT user_id FROM user_hobbies
                WHERE hobby IN (${sql.join(
                  selected.map((hobby) => sql`${hobby}`),
                  sql`, `,
                )})
                GROUP BY user_id HAVING count(DISTINCT hobby) = ${selected.length}
              )`
        }
        GROUP BY hobby ORDER BY count DESC, value ASC
      `)

    it('makes the top-20 hobbies a truncation of a long tail', () => {
      const ranks = hobbyFacet([])

      expect(ranks).toHaveLength(80)
      /* Falling away at the head and still falling at the truncation point —
         the two halves of "long tail" as opposed to "arbitrary slice". */
      expect(ranks[0]!.count).toBeGreaterThan(ranks[19]!.count * 4)
      expect(ranks[19]!.count).toBeGreaterThan(ranks[79]!.count * 2)
    })

    it('keeps the 20th-ranked hobby meaningful after two stacked selections', () => {
      const [first, second] = hobbyFacet([]).map((rank) => rank.value)
      const stacked = hobbyFacet([first!, second!])

      /* A count you could act on, not the wall of 1s a smaller dataset gives —
         and still more than 20 values to rank, so the sidebar is truncating. */
      expect(stacked.length).toBeGreaterThan(20)
      expect(stacked[19]!.count).toBeGreaterThan(20)
    })

    it('spreads nationalities down a tail too, so the 20th is not the last', () => {
      const ranks = db.all<{ value: string; count: number }>(sql`
        SELECT nationality AS value, count(*) AS count FROM users
        GROUP BY nationality ORDER BY count DESC, value ASC
      `)

      expect(ranks).toHaveLength(50)
      expect(ranks[0]!.count).toBeGreaterThan(ranks[19]!.count * 4)
      /* Every one of the 50 is populated: a nationality nobody has would be a
         chip the sidebar can never offer. */
      expect(ranks[49]!.count).toBeGreaterThan(0)
    })
  })

  it('leaves the planner fresh statistics, because the seed ANALYZEs', () => {
    const analysed = db.all<{ tbl: string }>(sql`SELECT DISTINCT tbl FROM sqlite_stat1 ORDER BY tbl`)

    expect(analysed.map((row) => row.tbl)).toContain('users')
    expect(analysed.map((row) => row.tbl)).toContain('user_hobbies')
  })
})

const digestOf = (db: Db): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        db.all(sql`SELECT * FROM users ORDER BY id`),
        db.all(sql`SELECT * FROM user_hobbies ORDER BY user_id, hobby`),
      ]),
    )
    .digest('hex')

describe('running the seed again', () => {
  /* At the full size, because this is the claim the README makes: clone, seed,
     seed again, and the directory you are looking at is the same one.

     Hence the raised timeout, and only here: two 25,000-user seeds plus two
     digests over every row is the most work any single test in the suite does,
     and the default 5s is a budget it was already spending most of on a busy
     CI runner. Left at the default, what fails first is the machine being
     loaded rather than the seed being non-deterministic — and that reads as
     this test's own claim breaking. The other cases run at sizes chosen to be
     quick, so the default stays where it is for them. */
  it(
    'yields the identical dataset, not a second copy of it',
    () => {
      const db = openUnmigrated()

      seedDirectory(db)
      const first = digestOf(db)
      seedDirectory(db)

      expect(digestOf(db)).toBe(first)
      expect(countOf(db, sql`SELECT count(*) AS count FROM users`)).toBe(DEFAULT_USER_COUNT)
    },
    30_000,
  )

  /* Truncating rather than guarded. A row-count guard would make the second run
     silently do nothing, with no way to reseed short of deleting the file. */
  it('throws the previous dataset away rather than adding to it', () => {
    const db = openUnmigrated()

    seedDirectory(db, { userCount: 400 })
    seedDirectory(db, { userCount: 50 })

    expect(countOf(db, sql`SELECT count(*) AS count FROM users`)).toBe(50)
    expect(countOf(db, sql`SELECT count(*) AS count FROM user_hobbies WHERE user_id > 50`)).toBe(0)
  })
})

describe('the write transaction', () => {
  /* The clear and the insert are one transaction, so a failure part-way through
     cannot leave half a directory behind. The trigger is the failure: it lets
     the delete and the first rows through, then aborts — and what survives has
     to be the *previous* dataset, delete included. */
  it('rolls the clear back with the insert when a write fails part-way', () => {
    const db = openUnmigrated()
    seedDirectory(db, { userCount: 60 })
    db.run(sql`
      CREATE TRIGGER refuse_the_thirtieth AFTER INSERT ON users WHEN NEW.id = 30
      BEGIN SELECT RAISE(ABORT, 'no further'); END
    `)

    expect(() => seedDirectory(db, { userCount: 200 })).toThrow(/no further/)

    expect(countOf(db, sql`SELECT count(*) AS count FROM users`)).toBe(60)
    expect(countOf(db, sql`SELECT count(*) AS count FROM user_hobbies`)).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from 'vitest'
import { normalizeSearchText } from '../src/feature/user/lib/normalize-search-text.ts'
import { user_hobbies, users } from '../src/shared/db/schema.ts'
import {
  DIRECTORY,
  HOBBY_WITH_COMMA,
  HOBBY_WITH_SPACE,
  NATIONALITY_WITH_COMMA,
  seedDirectoryFixture,
} from './support/directory-fixture.ts'
import { createTestServer } from './support/test-server.ts'

/* The fixture is a spec as much as it is data: every filter test below it reads
   `[1, 3, 7]` and trusts that those rows still say what they said. These assert
   the properties the ticket asked the fixture to hold, so a well-meaning edit
   that drops the last 10-hobby user or trims the tail of nationalities fails
   here — loudly, and next to the reason — rather than turning some unrelated
   filter test green for the wrong reason. */

const server = createTestServer({ seed: seedDirectoryFixture })

const hobbyCounts = DIRECTORY.map((user) => user.hobbies.length)
const distinct = <T>(values: T[]): Set<T> => new Set(values)

describe('the directory fixture', () => {
  it('holds around sixty people with unique ids', () => {
    expect(DIRECTORY).toHaveLength(60)
    expect(distinct(DIRECTORY.map((user) => user.id)).size).toBe(60)
  })

  /* Both extremes of the 0-10 range, because they are the two card states the
     client has to render and the two edges an ALL-of filter can trip over. */
  it('includes someone with no hobbies and someone with the maximum ten', () => {
    expect(Math.min(...hobbyCounts)).toBe(0)
    expect(Math.max(...hobbyCounts)).toBe(10)
  })

  /* More than twenty in each dimension, so a top-20 facet (#21) is a genuine
     truncation of a longer list rather than the whole list relabelled. */
  it('spans more than twenty distinct hobbies and more than twenty distinct nationalities', () => {
    expect(distinct(DIRECTORY.flatMap((user) => user.hobbies)).size).toBeGreaterThan(20)
    expect(distinct(DIRECTORY.map((user) => user.nationality)).size).toBeGreaterThan(20)
  })

  /* Ties are what an `id` tie-breaker is for (#20), and a nationality only one
     person holds can never show an ANY-of selection widening. */
  it('repeats an age across several people and a nationality across several people', () => {
    const sharedAges = countsOf(DIRECTORY.map((user) => user.age)).filter((count) => count > 1)
    const sharedNationalities = countsOf(DIRECTORY.map((user) => user.nationality)).filter(
      (count) => count > 1,
    )

    expect(Math.max(...sharedAges)).toBeGreaterThanOrEqual(5)
    expect(sharedNationalities.length).toBeGreaterThanOrEqual(2)
  })

  /* A term that reaches a person only through their surname. Without one, a
     query module that searched `first_name` alone would pass every text test. */
  it('has a surname no first name contains, so last-name matching can be proven', () => {
    const surnameOnly = normalizeSearchText('Halvorsen')

    expect(searchNames().filter((name) => name.includes(surnameOnly))).toEqual(['bjorn halvorsen'])
  })

  it('carries mixed-case names', () => {
    const names = DIRECTORY.map((user) => user.last_name)

    expect(names).toContain('MacDonald')
    expect(names).toContain('van Dijk')
  })

  /* The three the ticket names, each folded by a different mechanism: Ö by the
     diacritic strip, ø by the fold map, ë by the strip again after NFD. */
  it.each([
    ['Özcan', 'ozcan'],
    ['Bjørn', 'bjorn'],
    ['Zoë', 'zoe'],
  ])('carries the non-ASCII name %s, normalising to %s', (name, normalized) => {
    expect(DIRECTORY.some((user) => `${user.first_name} ${user.last_name}`.includes(name))).toBe(true)
    expect(searchNames().some((searchName) => searchName.includes(normalized))).toBe(true)
  })

  /* Selections travel as repeated keys precisely because these exist. */
  it('carries a nationality with a comma and hobbies with a comma and a space', () => {
    expect(NATIONALITY_WITH_COMMA).toContain(',')
    expect(HOBBY_WITH_COMMA).toContain(',')
    expect(HOBBY_WITH_SPACE).toContain(' ')
    expect(DIRECTORY.some((user) => user.nationality === NATIONALITY_WITH_COMMA)).toBe(true)
    expect(DIRECTORY.some((user) => user.hobbies.includes(HOBBY_WITH_COMMA))).toBe(true)
    expect(DIRECTORY.some((user) => user.hobbies.includes(HOBBY_WITH_SPACE))).toBe(true)
  })

  /* The rows the endpoint queries are the rows written above — asserted through
     the same handle the app was built with, so a seeder that silently dropped
     the hobby rows could not hide behind a passing filter test. */
  it('reaches the database the app queries, hobby rows and all', () => {
    const seededUsers = server.db.select().from(users).all()
    const seededHobbies = server.db.select().from(user_hobbies).all()

    expect(seededUsers).toHaveLength(60)
    expect(seededHobbies).toHaveLength(hobbyCounts.reduce((total, count) => total + count, 0))
  })
})

const countsOf = <T>(values: T[]): number[] => {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.values()]
}

const searchNames = (): string[] =>
  DIRECTORY.map((user) => normalizeSearchText(`${user.first_name} ${user.last_name}`))

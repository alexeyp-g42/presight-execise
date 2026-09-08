import { describe, expect, it } from 'vitest'
import { parseFilterState } from '../src/query/filters.js'
import { buildFilterPredicate, escapeLike } from '../src/query/sql.js'
import { createFixtureDb } from './fixture.js'

function matchingIds(query: Record<string, unknown>): number[] {
  const db = createFixtureDb()
  const predicate = buildFilterPredicate(parseFilterState(query))
  const rows = db
    .prepare(`SELECT u.id FROM users u WHERE ${predicate.sql} ORDER BY u.id`)
    .all(predicate.params) as Array<{ id: number }>
  return rows.map((row) => row.id)
}

describe('buildFilterPredicate', () => {
  it('matches everyone when no filters are set', () => {
    expect(matchingIds({})).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('matches the text filter as a prefix of either name', () => {
    expect(matchingIds({ q: 'ad' })).toEqual([1, 3])
  })

  it('matches the text filter against last names too', () => {
    expect(matchingIds({ q: 'lis' })).toEqual([8])
  })

  it('ignores case in the text filter', () => {
    expect(matchingIds({ q: 'AD' })).toEqual([1, 3])
  })

  it('does not match the text filter mid-word', () => {
    expect(matchingIds({ q: 'yron' })).toEqual([])
  })

  it('combines nationalities with OR', () => {
    expect(matchingIds({ nationalities: ['British', 'Austrian'] })).toEqual([1, 2, 3, 6])
  })

  it('combines hobbies with AND', () => {
    expect(matchingIds({ hobbies: ['Chess', 'Astronomy'] })).toEqual([1, 6])
  })

  it('returns nothing when no user holds every selected hobby', () => {
    expect(matchingIds({ hobbies: ['Weaving', 'Sailing'] })).toEqual([])
  })

  it('applies text, nationality and hobby filters together', () => {
    expect(
      matchingIds({ q: 'a', nationalities: ['British'], hobbies: ['Chess'] }),
    ).toEqual([1, 2, 3])
  })

  it('treats a wildcard in the text filter as a literal', () => {
    expect(matchingIds({ q: '%' })).toEqual([])
  })
})

describe('escapeLike', () => {
  it('escapes the SQL wildcards and the escape character itself', () => {
    expect(escapeLike('a%b_c\\d')).toBe('a\\%b\\_c\\\\d')
  })
})

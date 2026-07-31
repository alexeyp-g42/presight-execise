import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import { parseUserFilterParams } from '../../src/users/user-filter-params.ts'

/* The one module in the server with unit tests. Everything else is exercised
   through seam 1, but the decoding rules here are combinatorial — one value
   versus several, absent versus blank, known key versus near-miss — and driving
   each of them over HTTP would cost a request to assert a branch.
 *
 * The inputs below are what Express 5's `simple` parser actually hands over:
 * `querystring.parse` gives a bare string for one occurrence of a key and an
 * array for several. */

describe('parseUserFilterParams', () => {
  it('defaults to no term and no selections', () => {
    expect(parseUserFilterParams({})).toEqual({ q: undefined, hobbies: [], nationalities: [] })
  })

  /* The edge the ticket calls out by name: `?hobbies=chess` is a string, not a
     one-element array. Left unhandled it spreads into ['c','h','e','s','s'] or
     throws, depending on which consumer meets it first. */
  it('reads one repeated key, which arrives as a string, as a one-element selection', () => {
    expect(parseUserFilterParams({ hobbies: 'chess' }).hobbies).toEqual(['chess'])
  })

  it('reads several repeated keys, which arrive as an array, unchanged', () => {
    expect(parseUserFilterParams({ hobbies: ['chess', 'judo'] }).hobbies).toEqual(['chess', 'judo'])
  })

  it('treats the string and the one-element array as the same selection', () => {
    expect(parseUserFilterParams({ nationalities: 'Turkey' })).toEqual(
      parseUserFilterParams({ nationalities: ['Turkey'] }),
    )
  })

  /* Not cosmetic. The ALL-of predicate compares `COUNT(DISTINCT hobby)` against
     the selection's length, so a duplicate would ask for two distinct hobbies
     from a user who can only supply one — and return nothing, silently. */
  it('deduplicates a selection, because a selection is a set', () => {
    expect(parseUserFilterParams({ hobbies: ['chess', 'chess', 'judo'] }).hobbies).toEqual([
      'chess',
      'judo',
    ])
  })

  /* Values are carried verbatim: these are exactly the values that comma-joining
     a selection would destroy. */
  it('leaves commas and spaces inside a single value alone', () => {
    expect(parseUserFilterParams({ nationalities: ['Korea, Republic of'] }).nationalities).toEqual([
      'Korea, Republic of',
    ])
    expect(parseUserFilterParams({ hobbies: ['board games'] }).hobbies).toEqual(['board games'])
  })

  it('trims the search term', () => {
    expect(parseUserFilterParams({ q: '  Özcan  ' }).q).toBe('Özcan')
  })

  it.each([
    ['an empty', ''],
    ['a whitespace-only', '   '],
  ])('treats %s term as absent rather than as a match-everything pattern', (_case, term) => {
    expect(parseUserFilterParams({ q: term }).q).toBeUndefined()
  })

  it('imposes no minimum length on the term', () => {
    expect(parseUserFilterParams({ q: 'a' }).q).toBe('a')
  })

  /* Stripping unknown keys is the default nearly everywhere and is the worst
     available failure here: `?nationality=Turkey` would return the unfiltered
     directory, which looks like a working search that found a lot of people. */
  it.each([
    ['a singular near-miss', { nationality: 'Turkey' }],
    ['a camelCase spelling', { sortBy: 'age' }],
    ['a key from a later ticket', { sort: 'age' }],
    ['a key that means nothing at all', { colour: 'blue' }],
  ])('rejects %s rather than stripping it', (_case, query) => {
    expect(() => parseUserFilterParams(query)).toThrow(ZodError)
  })

  it('names the offending key, so a 400 can say which one it was', () => {
    expect(() => parseUserFilterParams({ nationality: 'Turkey' })).toThrow(/nationality/)
  })

  /* One value is meaningful for `q`, so an array is a client bug — and failing
     loudly is the difference between a fixed client and a search box that
     quietly ignores half of what was typed. */
  it('rejects a term that arrives as several repeated keys', () => {
    expect(() => parseUserFilterParams({ q: ['ada', 'grace'] })).toThrow(ZodError)
  })

  it('rejects a selection whose values are not strings', () => {
    expect(() => parseUserFilterParams({ hobbies: [1, 2] })).toThrow(ZodError)
  })
})

import { describe, expect, it } from 'vitest'
import {
  QueryError,
  encodeCursor,
  parseFilterState,
  parsePageRequest,
} from '../src/query/filters.js'

describe('parseFilterState', () => {
  it('applies defaults to an empty query', () => {
    expect(parseFilterState({})).toEqual({
      q: '',
      nationalities: [],
      hobbies: [],
      sort: 'first_name',
      order: 'asc',
    })
  })

  it('accepts a repeated parameter as an array', () => {
    const state = parseFilterState({ nationalities: ['British', 'Japanese'] })

    expect(state.nationalities).toEqual(['British', 'Japanese'])
  })

  it('accepts a single occurrence as a one-element array', () => {
    const state = parseFilterState({ hobbies: 'Chess' })

    expect(state.hobbies).toEqual(['Chess'])
  })

  it('trims the text filter', () => {
    expect(parseFilterState({ q: '  ada ' }).q).toBe('ada')
  })

  it('drops empty and duplicate filter values', () => {
    const state = parseFilterState({ hobbies: ['Chess', '', 'Chess', ' '] })

    expect(state.hobbies).toEqual(['Chess'])
  })

  it('rejects a sort field outside the whitelist', () => {
    expect(() => parseFilterState({ sort: 'id; DROP TABLE users' })).toThrow(QueryError)
  })

  it('names the offending field on rejection', () => {
    try {
      parseFilterState({ order: 'sideways' })
      expect.unreachable('should have thrown')
    } catch (error) {
      expect((error as QueryError).field).toBe('order')
    }
  })
})

describe('parsePageRequest', () => {
  it('defaults the limit to 30 and the cursor to null', () => {
    const request = parsePageRequest({})

    expect(request.limit).toBe(30)
    expect(request.cursor).toBeNull()
  })

  it('accepts a limit inside the allowed range', () => {
    expect(parsePageRequest({ limit: '50' }).limit).toBe(50)
  })

  it('rejects a limit above the allowed range', () => {
    expect(() => parsePageRequest({ limit: '5000' })).toThrow(QueryError)
  })

  it('round-trips a string cursor', () => {
    const request = parsePageRequest({ cursor: encodeCursor('Byron', 41) })

    expect(request.cursor).toEqual({ v: 'Byron', id: 41 })
  })

  it('round-trips a numeric cursor', () => {
    const request = parsePageRequest({ cursor: encodeCursor(36, 7) })

    expect(request.cursor).toEqual({ v: 36, id: 7 })
  })

  it('rejects a malformed cursor', () => {
    expect(() => parsePageRequest({ cursor: 'not-base64-json' })).toThrow(QueryError)
  })
})

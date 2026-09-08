import { describe, expect, it } from 'vitest'
import { parseFilterState } from '../src/query/filters.js'
import { queryFacets } from '../src/query/facets.js'
import { createFixtureDb } from './fixture.js'

function facetsFor(query: Record<string, unknown>) {
  return queryFacets(createFixtureDb(), parseFilterState(query))
}

describe('queryFacets', () => {
  it('counts every nationality when unfiltered', () => {
    expect(facetsFor({}).nationalities).toEqual([
      { value: 'American', count: 4 },
      { value: 'British', count: 3 },
      { value: 'Austrian', count: 1 },
    ])
  })

  it('counts every hobby when unfiltered and breaks ties by value', () => {
    expect(facetsFor({}).hobbies).toEqual([
      { value: 'Chess', count: 6 },
      { value: 'Astronomy', count: 3 },
      { value: 'Running', count: 3 },
      { value: 'Sailing', count: 2 },
      { value: 'Weaving', count: 1 },
    ])
  })

  it('reports the total of the filtered set', () => {
    expect(facetsFor({}).total).toBe(8)
    expect(facetsFor({ nationalities: ['British'] }).total).toBe(3)
  })

  it('narrows both facets to the text filter', () => {
    const facets = facetsFor({ q: 'ad' })

    expect(facets.total).toBe(2)
    expect(facets.nationalities).toEqual([{ value: 'British', count: 2 }])
    expect(facets.hobbies).toEqual([
      { value: 'Chess', count: 2 },
      { value: 'Astronomy', count: 1 },
      { value: 'Weaving', count: 1 },
    ])
  })

  it('lists every nationality regardless of the nationality filter', () => {
    const facets = facetsFor({ nationalities: ['Austrian'] })

    expect(facets.nationalities).toEqual([
      { value: 'American', count: 4 },
      { value: 'British', count: 3 },
      { value: 'Austrian', count: 1 },
    ])
    expect(facets.total).toBe(1)
    expect(facets.hobbies).toEqual([
      { value: 'Astronomy', count: 1 },
      { value: 'Chess', count: 1 },
    ])
  })

  it('scopes the nationality facet to the text filter but not to the nationality filter', () => {
    const facets = facetsFor({ q: 'ad', nationalities: ['American'] })

    expect(facets.total).toBe(0)
    expect(facets.nationalities).toEqual([{ value: 'British', count: 2 }])
    expect(facets.hobbies).toEqual([])
  })

  it('counts facets over the fully filtered set including the selected hobbies', () => {
    const facets = facetsFor({ hobbies: ['Chess', 'Astronomy'] })

    expect(facets.total).toBe(2)
    expect(facets.hobbies).toEqual([
      { value: 'Astronomy', count: 2 },
      { value: 'Chess', count: 2 },
      { value: 'Weaving', count: 1 },
    ])
  })

  it('returns empty facets when nothing matches', () => {
    const facets = facetsFor({ q: 'zzz' })

    expect(facets).toEqual({ total: 0, hobbies: [], nationalities: [] })
  })

  it('caps each facet list at twenty entries', () => {
    const db = createFixtureDb()
    const insertHobby = db.prepare('INSERT INTO hobbies (name) VALUES (?)')
    const insertLink = db.prepare('INSERT INTO user_hobbies (user_id, hobby_id) VALUES (1, ?)')
    for (let index = 0; index < 40; index += 1) {
      insertLink.run(Number(insertHobby.run(`Extra ${index}`).lastInsertRowid))
    }

    expect(queryFacets(db, parseFilterState({})).hobbies).toHaveLength(20)
  })
})

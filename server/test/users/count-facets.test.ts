import { describe, expect, it } from 'vitest'
import type { FacetEntry } from '@presight/shared'
import {
  HOBBY_WITH_COMMA,
  HOBBY_WITH_SPACE,
  NATIONALITY_WITH_COMMA,
  seedDirectoryFixture,
} from '../support/directory-fixture.ts'
import { createTestServer } from '../support/test-server.ts'
import type { ApiErrorBody } from '../../src/http/api-error.ts'

/* Through seam 1, against the hand-authored fixture — which carries 25 distinct
   hobbies and 38 distinct nationalities on purpose, so the top-20 cap is
   actually exercised rather than asserted against a list that never fills.
 *
 * Every expectation below is counted off the fixture table by hand. Computing
 * one the way the endpoint computes it would prove only that the two agree. */

const server = createTestServer({ seed: seedDirectoryFixture })

const valuesOf = (facet: FacetEntry[]): string[] => facet.map((entry) => entry.value)

const countOf = (facet: FacetEntry[], value: string): number | undefined =>
  facet.find((entry) => entry.value === value)?.count

describe('GET /api/facets', () => {
  it('returns the documented snake_case shape over the result set', async () => {
    expect(await server.getFacets({ q: 'Halvorsen' })).toEqual({
      total: 1,
      hobbies: [
        { value: 'sailing', count: 1 },
        { value: 'skiing', count: 1 },
      ],
      nationalities: [{ value: 'Norway', count: 1 }],
    })
  })

  /* The list endpoint answers a fixed page; the total describes the whole
     result set behind it, which is the number the "Showing 50 of 60" header
     needs and the reason the total lives here rather than on the list. */
  it('reports a total larger than the page the list endpoint returns', async () => {
    const facets = await server.getFacets()
    const list = await server.listUsers()

    expect(facets.total).toBe(60)
    expect(list.users).toHaveLength(50)
  })

  it('narrows the total with the filter params', async () => {
    expect((await server.getFacets({ nationalities: ['Germany', 'Turkey'] })).total).toBe(11)
    expect((await server.getFacets({ hobbies: ['chess', 'hiking'] })).total).toBe(6)
    expect((await server.getFacets({ q: 'marc' })).total).toBe(2)
  })
})

/* The highest-value case in the suite, and the one most implementations get
   wrong: a facet describes the people currently matched, not the directory. A
   sidebar counting the whole dataset offers chess to a room of three Norwegian
   sailors, none of whom play it. */
describe('facets reflect the result set, not the global dataset', () => {
  it('counts only the people the filter matched', async () => {
    const { hobbies } = await server.getFacets({ nationalities: ['Norway'] })

    expect(hobbies).toEqual([
      { value: 'sailing', count: 2 },
      { value: 'skiing', count: 2 },
      { value: 'hiking', count: 1 },
      { value: 'running', count: 1 },
    ])
  })

  /* chess is the fixture's most common hobby at 15 people, and not one of them
     is Norwegian. A global count would put it at the top of this facet. */
  it('drops a hobby that is common globally but absent from the result set', async () => {
    const norwegians = await server.getFacets({ nationalities: ['Norway'] })
    const everyone = await server.getFacets()

    expect(countOf(everyone.hobbies, 'chess')).toBe(15)
    expect(valuesOf(norwegians.hobbies)).not.toContain('chess')
  })

  /* The text term is part of the predicate both facets are built from, so a
     search narrows the sidebar the same way a selection does. */
  it('applies the text term to both facets', async () => {
    expect(await server.getFacets({ q: 'muller' })).toEqual({
      total: 1,
      hobbies: [
        { value: 'chess', count: 1 },
        { value: 'hiking', count: 1 },
      ],
      nationalities: [{ value: 'Germany', count: 1 }],
    })
  })
})

/* The governing invariant: a facet count must predict what happens when you
   click it. It resolves oppositely per dimension because hobbies are ALL-of and
   nationalities are ANY-of — doing the same thing on both sides is wrong on one
   of them, whichever thing you pick. */
describe('the asymmetric facet rule', () => {
  /* Hobbies narrow, so co-occurrence *within* the result set is the drill-down
     preview: 6 of the 15 chess players also hike, so adding hiking leaves 6. */
  it('keeps the hobby selection, so each count is what adding it leaves', async () => {
    const { total, hobbies } = await server.getFacets({ hobbies: ['chess'] })

    expect(total).toBe(15)
    expect(hobbies).toEqual([
      { value: 'chess', count: 15 },
      { value: 'hiking', count: 6 },
      { value: 'board games', count: 3 },
      { value: 'cycling', count: 3 },
      { value: 'archery', count: 2 },
      { value: 'reading', count: 2 },
      { value: 'swimming', count: 2 },
      { value: 'yoga', count: 2 },
      { value: 'baking', count: 1 },
      { value: 'calligraphy', count: 1 },
      { value: 'gardening', count: 1 },
      { value: 'guitar', count: 1 },
      { value: 'judo', count: 1 },
      { value: 'sailing', count: 1 },
      { value: 'travel', count: 1 },
      { value: 'woodworking', count: 1 },
    ])
  })

  it('brings a selected hobby back at the size of the result set', async () => {
    const { total, hobbies } = await server.getFacets({ hobbies: ['chess', 'hiking'] })

    expect(total).toBe(6)
    expect(countOf(hobbies, 'chess')).toBe(6)
    expect(countOf(hobbies, 'hiking')).toBe(6)
  })

  /* Nationalities widen, so keeping the selection would dead-end the sidebar:
     no unselected nationality could ever appear, and the viewer could never
     discover a second one to add. Germany is selected here and still comes back
     at its own count under the emptied predicate — 2, not the total. */
  it('drops the nationality selection, so each count is what adding it brings in', async () => {
    const { total, nationalities } = await server.getFacets({
      hobbies: ['chess'],
      nationalities: ['Germany'],
    })

    expect(total).toBe(2)
    expect(nationalities).toEqual([
      { value: 'Turkey', count: 3 },
      { value: 'Germany', count: 2 },
      { value: 'Azerbaijan', count: 1 },
      { value: 'Croatia', count: 1 },
      { value: 'Greece', count: 1 },
      { value: 'Kenya', count: 1 },
      { value: NATIONALITY_WITH_COMMA, count: 1 },
      { value: 'Netherlands', count: 1 },
      { value: 'Poland', count: 1 },
      { value: 'Spain', count: 1 },
      { value: 'United Kingdom', count: 1 },
      { value: 'United States', count: 1 },
    ])
  })

  /* The both-naive alternative fails exactly here: with the selection kept, the
     only nationality in this facet would be Norway, and the sidebar would offer
     the viewer nothing to click. */
  it('still offers unselected nationalities while a nationality is selected', async () => {
    const { nationalities } = await server.getFacets({ nationalities: ['Norway'] })

    expect(countOf(nationalities, 'Norway')).toBe(3)
    expect(countOf(nationalities, 'Turkey')).toBe(5)
    expect(valuesOf(nationalities).length).toBeGreaterThan(1)
  })

  /* The hobby selection still narrows the *nationality* facet — only the
     nationality selection is dropped from it, not the whole predicate. */
  it('drops only its own dimension, not the rest of the predicate', async () => {
    const { nationalities } = await server.getFacets({
      hobbies: ['chess', 'hiking'],
      nationalities: ['Germany'],
    })

    expect(nationalities).toEqual([
      { value: 'Germany', count: 2 },
      { value: 'Croatia', count: 1 },
      { value: 'Kenya', count: 1 },
      { value: 'Turkey', count: 1 },
      { value: 'United States', count: 1 },
    ])
  })
})

describe('facet ordering and the top-20 cap', () => {
  /* Ties broken by value ASC under SQLite's BINARY collation, which is what
     makes a facet response byte-identical between two runs of the same query. */
  it('orders by count DESC, value ASC and stops at 20', async () => {
    const { hobbies } = await server.getFacets()

    expect(hobbies).toEqual([
      { value: 'chess', count: 15 },
      { value: 'hiking', count: 11 },
      { value: 'reading', count: 10 },
      { value: 'travel', count: 7 },
      { value: HOBBY_WITH_SPACE, count: 6 },
      { value: 'cycling', count: 6 },
      { value: 'guitar', count: 6 },
      { value: 'running', count: 6 },
      { value: 'sailing', count: 6 },
      { value: 'skiing', count: 6 },
      { value: 'swimming', count: 6 },
      { value: 'yoga', count: 6 },
      { value: 'baking', count: 4 },
      { value: 'surfing', count: 4 },
      { value: 'birdwatching', count: 3 },
      { value: 'knitting', count: 3 },
      { value: 'origami', count: 3 },
      { value: 'painting', count: 3 },
      { value: HOBBY_WITH_COMMA, count: 3 },
      { value: 'pottery', count: 3 },
    ])
  })

  /* 25 distinct hobbies in the fixture, so five fall off the end — proof the
     cap is a cap rather than a number the data never reaches. */
  it('truncates the long tail of hobbies', async () => {
    const { hobbies } = await server.getFacets()

    for (const cut of ['archery', 'calligraphy', 'gardening', 'judo', 'woodworking']) {
      expect(valuesOf(hobbies)).not.toContain(cut)
    }
  })

  it('caps the nationality facet at 20 and truncates its tail', async () => {
    const { nationalities } = await server.getFacets()

    expect(nationalities).toHaveLength(20)
    expect(valuesOf(nationalities).slice(0, 5)).toEqual([
      'Germany',
      'Turkey',
      'Netherlands',
      'Norway',
      'United States',
    ])
    /* Denmark is the first of the 26 one-person nationalities to miss the cut. */
    expect(valuesOf(nationalities)).not.toContain('Denmark')
    expect(valuesOf(nationalities)).not.toContain('Vietnam')
  })
})

/* No selection can be stranded: whatever the viewer picked comes back, so the
   chip stays on screen and stays clickable. Without this a rare nationality
   drops below the cut with no way to deselect it except reloading. */
describe('pinned values', () => {
  it('pins a selected nationality that ranks below the top 20, at its true count', async () => {
    const { nationalities } = await server.getFacets({ nationalities: ['Vietnam'] })

    expect(nationalities).toHaveLength(21)
    expect(countOf(nationalities, 'Vietnam')).toBe(1)
  })

  it('pins only the selections the top 20 missed, so nothing is duplicated', async () => {
    const { nationalities } = await server.getFacets({ nationalities: ['Norway', 'Iceland'] })

    /* Norway is already in the top 20 at 3; only Iceland is pinned. */
    expect(nationalities).toHaveLength(21)
    expect(valuesOf(nationalities).filter((value) => value === 'Norway')).toEqual(['Norway'])
    expect(countOf(nationalities, 'Norway')).toBe(3)
    expect(countOf(nationalities, 'Iceland')).toBe(1)
  })

  it('pins a selection that matches nothing at count 0', async () => {
    const { total, hobbies, nationalities } = await server.getFacets({ hobbies: ['quidditch'] })

    expect(total).toBe(0)
    expect(hobbies).toEqual([{ value: 'quidditch', count: 0 }])
    expect(nationalities).toEqual([])
  })

  /* An empty result set makes even a real, popular hobby vanish from its own
     facet — there are no rows left to group. Pinning is the only thing keeping
     the chess chip deselectable here. */
  it('keeps a real selected hobby on screen when the result set is empty', async () => {
    const { total, hobbies } = await server.getFacets({ q: 'zzzzz', hobbies: ['chess'] })

    expect(total).toBe(0)
    expect(hobbies).toEqual([{ value: 'chess', count: 0 }])
  })

  it('pins every selected value, not just the first', async () => {
    const { hobbies } = await server.getFacets({ q: 'zzzzz', hobbies: ['chess', 'quidditch'] })

    expect(hobbies).toEqual([
      { value: 'chess', count: 0 },
      { value: 'quidditch', count: 0 },
    ])
  })

  /* The nationality facet drops its own selection, so an unknown nationality
     leaves the facet fully populated behind the pinned chip — 20 + 1. */
  it('returns a still-populated facet response for an empty result set', async () => {
    const { total, hobbies, nationalities } = await server.getFacets({
      nationalities: ['Atlantis'],
    })

    expect(total).toBe(0)
    expect(hobbies).toEqual([])
    expect(nationalities).toHaveLength(21)
    expect(countOf(nationalities, 'Atlantis')).toBe(0)
  })
})

/* Free text and display names carry commas and spaces, which is why selections
   travel as repeated keys. A value that survives the list endpoint has to
   survive the facet counts too, or the chip and the rows disagree. */
describe('values carrying a comma or a space', () => {
  it('counts a hobby containing a comma', async () => {
    const { total, hobbies, nationalities } = await server.getFacets({
      hobbies: [HOBBY_WITH_COMMA],
    })

    expect(total).toBe(3)
    expect(hobbies).toEqual([
      { value: HOBBY_WITH_COMMA, count: 3 },
      { value: 'birdwatching', count: 1 },
      { value: 'origami', count: 1 },
    ])
    expect(nationalities).toEqual([
      { value: 'France', count: 1 },
      { value: 'Japan', count: 1 },
      { value: 'United States', count: 1 },
    ])
  })

  it('counts a nationality containing a comma', async () => {
    const { total, hobbies } = await server.getFacets({
      nationalities: [NATIONALITY_WITH_COMMA],
    })

    expect(total).toBe(2)
    expect(hobbies).toEqual([
      { value: HOBBY_WITH_SPACE, count: 1 },
      { value: 'calligraphy', count: 1 },
      { value: 'chess', count: 1 },
      { value: 'judo', count: 1 },
    ])
  })
})

/* The endpoint split is enforced in the contract, not left to the client's
   discipline: facets are page- and sort-independent, so a `sort` that arrived
   here would be a client bug worth a loud 400 rather than a silent no-op. */
describe('strict query validation', () => {
  const expectInvalidQuery = async (query: string) => {
    const response = await server.request.get(`/api/facets?${query}`).expect(400)
    const body = response.body as ApiErrorBody

    expect(body.error.code).toBe('INVALID_QUERY')
    return body
  }

  it.each(['sort=age', 'dir=desc', 'limit=10', 'cursor=abc'])(
    'rejects a list-only key as unrecognized: %s',
    async (query) => {
      await expectInvalidQuery(query)
    },
  )

  it('rejects a singular near-miss of a real key', async () => {
    const body = await expectInvalidQuery('nationality=Turkey')

    expect(JSON.stringify(body)).toContain('nationality')
  })

  it('rejects a repeated key where only one value is meaningful', async () => {
    await expectInvalidQuery('q=ada&q=grace')
  })

  it('rejects bracket syntax rather than reading it as a selection', async () => {
    await expectInvalidQuery('hobbies%5B%5D=chess')
  })
})

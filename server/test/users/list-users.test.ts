import { describe, expect, it } from 'vitest'
import type { UserListResponse } from '@presight/shared'
import {
  HOBBY_WITH_COMMA,
  HOBBY_WITH_SPACE,
  NATIONALITY_WITH_COMMA,
  seedDirectoryFixture,
} from '../support/directory-fixture.ts'
import { createTestServer } from '../support/test-server.ts'
import type { ApiErrorBody } from '../../src/http/api-error.ts'

/* Through real HTTP, against the hand-authored fixture. Query-string decoding
   is exactly where filter semantics get broken silently — a handler called
   directly would be handed an array the wire never produced — so every case
   here goes over the socket.
 *
 * Expectations are written as literal id lists checked against the fixture
 * table, never computed the way the endpoint computes them. */

const server = createTestServer({ seed: seedDirectoryFixture })

/* Sorted numerically rather than left in response order, deliberately: this
   ticket owns *which* people come back, #20 owns the order they come back in.
   Asserting the set keeps every expectation below from having to be rewritten
   the day `sort` and `dir` become parameters. */
const idsOf = ({ users }: UserListResponse): number[] =>
  users.map((user) => user.id).sort((left, right) => left - right)

describe('GET /api/users', () => {
  it('returns the documented snake_case shape, with a derived avatar path', async () => {
    expect(await server.listUsers({ q: 'Halvorsen' })).toEqual({
      users: [
        {
          id: 12,
          first_name: 'Bjørn',
          last_name: 'Halvorsen',
          age: 47,
          nationality: 'Norway',
          avatar: '/api/avatars/12.svg',
          hobbies: ['sailing', 'skiing'],
        },
      ],
      page_info: { has_more: false, next_cursor: null },
    })
  })

  /* The card shows two and a `+n`, which is a view fact. The contract returns
     everything: ~3KB a page, stable if the card changes its mind, and the only
     shape that lets selected hobbies be surfaced first. */
  it('returns the full hobby array, not the two a card shows', async () => {
    const response = await server.listUsers({ q: 'Osei' })

    expect(response.users[0]?.hobbies).toEqual([
      'archery',
      'baking',
      'board games',
      'chess',
      'cycling',
      'gardening',
      'hiking',
      'reading',
      'travel',
      'yoga',
    ])
  })

  it('gives someone with no hobbies an empty array rather than dropping the field', async () => {
    const response = await server.listUsers({ q: 'Braun' })

    expect(response.users).toEqual([expect.objectContaining({ id: 5, hobbies: [] })])
  })

  /* Sort, cursor and limit land in #20. Until they do the endpoint answers one
     fixed page, and `has_more` still has to tell the truth about the 60-row
     fixture behind it. */
  it('answers a fixed first page and reports that more remain', async () => {
    const response = await server.listUsers()

    expect(response.users).toHaveLength(50)
    expect(response.page_info).toEqual({ has_more: true, next_cursor: null })
    expect(new Set(idsOf(response)).size).toBe(50)
  })
})

describe('the text filter', () => {
  /* `marc` is in Marcus's first name and Marchetti's last, so one term proves
     both columns are searched — a first-name-only implementation passes every
     other text case in this file. */
  it('matches a first name and a last name under the same term', async () => {
    expect(idsOf(await server.listUsers({ q: 'marc' }))).toEqual([31, 35])
  })

  it('matches on a last name alone', async () => {
    expect(idsOf(await server.listUsers({ q: 'Halvorsen' }))).toEqual([12])
  })

  it('ignores case', async () => {
    expect(idsOf(await server.listUsers({ q: 'NAIR' }))).toEqual([39])
  })

  /* Mid-word, not a prefix — the leading wildcard is why `search_name` is
     deliberately unindexed. */
  it('matches a substring rather than a prefix', async () => {
    expect(idsOf(await server.listUsers({ q: 'chett' }))).toEqual([35])
  })

  it('searches the full name, so first and last together still land', async () => {
    expect(idsOf(await server.listUsers({ q: 'elif ozcan' }))).toEqual([7])
  })

  /* The heart of the normalised search column: the term goes through the same
     `normalizeSearchText()` the seed wrote `search_name` with, so what a viewer
     can type reaches the name printed on the card. SQLite folds ASCII only, and
     would leave every one of these unreachable on its own. */
  it.each([
    ['ozcan', 'Özcan', [7]],
    ['bjorn', 'Bjørn', [12]],
    ['zoe', 'Zoë', [6]],
    ['yilmaz', 'Yılmaz', [8]],
    ['elekber', 'Ələkbər', [47]],
    ['lukasz', 'Łukasz', [20]],
  ])('is accent-insensitive: %s finds %s', async (term, _name, expected) => {
    expect(idsOf(await server.listUsers({ q: term }))).toEqual(expected)
  })

  it('treats a blank term as no term at all', async () => {
    expect(await server.listUsers({ q: '   ' })).toEqual(await server.listUsers())
  })

  /* `%` and `_` are LIKE's wildcards. Unescaped, a viewer typing `%` would match
     the entire directory — a search that silently widens instead of narrowing. */
  it.each(['%', '_'])('treats LIKE wildcards as literal text: %s', async (term) => {
    const response = await server.listUsers({ q: term })

    expect(response.users).toEqual([])
    expect(response.page_info.has_more).toBe(false)
  })
})

/* Selecting more hobbies **narrows**: a user must hold every one of them. This
   is the asymmetry the whole facet design turns on, and the one a reviewer
   reading `IN (...)` would get backwards. */
describe('the hobby selection, which is ALL-of', () => {
  const CHESS_PLAYERS = [1, 3, 7, 9, 10, 16, 18, 20, 29, 30, 34, 47, 50, 54, 60]
  const CHESS_AND_HIKING = [1, 3, 7, 30, 54, 60]

  it('returns everyone holding the one selected hobby', async () => {
    expect(idsOf(await server.listUsers({ hobbies: ['chess'] }))).toEqual(CHESS_PLAYERS)
  })

  it('narrows to users holding every selected hobby when a second is added', async () => {
    expect(idsOf(await server.listUsers({ hobbies: ['chess', 'hiking'] }))).toEqual(CHESS_AND_HIKING)
    expect(CHESS_AND_HIKING.length).toBeLessThan(CHESS_PLAYERS.length)
  })

  /* The case an ANY-of implementation gets wrong while still looking sane: id 9
     plays chess but does not hike, id 13 hikes but does not play chess. Under
     ALL-of neither survives; under ANY-of both do. */
  it('excludes a user holding exactly one of the two selected hobbies', async () => {
    const ids = idsOf(await server.listUsers({ hobbies: ['chess', 'hiking'] }))

    expect(ids).not.toContain(9)
    expect(ids).not.toContain(13)
  })

  /* Free text, so a hobby can hold a space or a comma. Comma-joining the
     selection would split `photography, film` into two hobbies nobody holds —
     silently, and only for this one value. */
  it('round-trips a hobby containing a space', async () => {
    expect(idsOf(await server.listUsers({ hobbies: [HOBBY_WITH_SPACE] }))).toEqual([
      10, 15, 19, 30, 43, 60,
    ])
  })

  it('round-trips a hobby containing a comma', async () => {
    expect(idsOf(await server.listUsers({ hobbies: [HOBBY_WITH_COMMA] }))).toEqual([24, 31, 38])
  })

  it('applies ALL-of across a hobby with a space and one without', async () => {
    expect(idsOf(await server.listUsers({ hobbies: [HOBBY_WITH_SPACE, 'chess'] }))).toEqual([
      10, 30, 60,
    ])
  })
})

/* Selecting more nationalities **widens**: one of them is enough. The opposite
   of the block above, on purpose. */
describe('the nationality selection, which is ANY-of', () => {
  it('returns everyone holding the one selected nationality', async () => {
    expect(idsOf(await server.listUsers({ nationalities: ['Norway'] }))).toEqual([12, 13, 14])
  })

  it('widens to the union when a second is added', async () => {
    expect(idsOf(await server.listUsers({ nationalities: ['Norway', 'Iceland'] }))).toEqual([
      12, 13, 14, 46,
    ])
  })

  /* "Korea, Republic of" is why selections are repeated keys rather than a
     comma-joined string: joined, it would arrive as "Korea" and "Republic of",
     neither of which is a nationality anyone holds. */
  it('round-trips a nationality containing a comma', async () => {
    expect(idsOf(await server.listUsers({ nationalities: [NATIONALITY_WITH_COMMA] }))).toEqual([
      18, 19,
    ])
  })

  it('keeps a comma-bearing nationality intact alongside another selection', async () => {
    expect(
      idsOf(await server.listUsers({ nationalities: [NATIONALITY_WITH_COMMA, 'Iceland'] })),
    ).toEqual([18, 19, 46])
  })
})

/* The three dimensions are one predicate, not three passes — "Germans who play
   chess named Müller" is a single request. */
describe('text, hobbies and nationalities together', () => {
  it('intersects all three in one request', async () => {
    const ids = idsOf(
      await server.listUsers({ q: 'muller', hobbies: ['chess'], nationalities: ['Germany'] }),
    )

    expect(ids).toEqual([1])
  })

  it('narrows step by step as each dimension is added', async () => {
    const byNationality = idsOf(await server.listUsers({ nationalities: ['Germany', 'Turkey'] }))
    const andChess = idsOf(
      await server.listUsers({ nationalities: ['Germany', 'Turkey'], hobbies: ['chess'] }),
    )
    const andHiking = idsOf(
      await server.listUsers({
        nationalities: ['Germany', 'Turkey'],
        hobbies: ['chess', 'hiking'],
      }),
    )

    expect(byNationality).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(andChess).toEqual([1, 3, 7, 9, 10])
    expect(andHiking).toEqual([1, 3, 7])
  })
})

/* The pinned-value rule needs a selected value to survive at `count: 0` so it
   stays deselectable, and the system is *designed* for "you selected something
   that matches nothing". So this is the one place strict validation stands
   down: a 200 with nothing in it, never a 400 and never a 404. */
describe('a selection matching nothing', () => {
  it.each([
    ['an unknown hobby', { hobbies: ['quidditch'] }],
    ['an unknown nationality', { nationalities: ['Atlantis'] }],
    ['a name nobody has', { q: 'zzzzz' }],
    ['a combination nobody satisfies', { q: 'ozcan', nationalities: ['Germany'] }],
  ])('is a 200 with an empty result set: %s', async (_case, params) => {
    expect(await server.listUsers(params)).toEqual({
      users: [],
      page_info: { has_more: false, next_cursor: null },
    })
  })
})

/* Unknown keys are rejected rather than stripped, which is the whole argument:
   a stripped `?nationality=Turkey` returns the *unfiltered* directory, and an
   unfiltered directory that looks plausible is the worst failure available. */
describe('strict query validation', () => {
  const expectInvalidQuery = async (query: string) => {
    const response = await server.request.get(`/api/users?${query}`).expect(400)
    const body = response.body as ApiErrorBody

    expect(body.error.code).toBe('INVALID_QUERY')
    return body
  }

  it('rejects a singular near-miss of a real key', async () => {
    const body = await expectInvalidQuery('nationality=Turkey')

    expect(JSON.stringify(body)).toContain('nationality')
  })

  it('rejects a key that belongs to a later ticket', async () => {
    await expectInvalidQuery('sort=age')
    await expectInvalidQuery('limit=10')
    await expectInvalidQuery('cursor=abc')
  })

  it('rejects a camelCase spelling of a real key', async () => {
    await expectInvalidQuery('sortBy=age')
  })

  /* `q` is one value, so a repeated key is a client bug rather than a wider
     search — and it arrives as an array, which is the shape a selection uses. */
  it('rejects a repeated key where only one value is meaningful', async () => {
    await expectInvalidQuery('q=ada&q=grace')
  })

  /* Bracket syntax is what a caller reaches for when repeated keys look wrong,
     and under the `simple` parser it produces a key literally named `hobbies[]`.
     Rejecting it is the difference between a 400 and an unfiltered directory
     returned to a client that believes it selected a hobby. */
  it('rejects bracket syntax rather than reading it as a selection', async () => {
    await expectInvalidQuery('hobbies%5B%5D=chess')
  })
})

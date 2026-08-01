import { Buffer } from 'node:buffer'
import type { UserListResponse } from '@presight/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApiErrorBody, ErrorCode } from '../../src/http/api-error.ts'
import { seedDirectoryFixture } from '../support/directory-fixture.ts'
import { createTestServer, type QueryParams } from '../support/test-server.ts'

/* `limit` and the cursor, through real HTTP against the 60-row fixture. Page
   size 7 is a deliberate non-divisor of 60: 8 full pages and a short last one,
   which is where an off-by-one in `has_more` or in the seek surfaces. */

const server = createTestServer({ seed: seedDirectoryFixture })

const FIXTURE_SIZE = 60
const PAGE_SIZE = '7'
const WHOLE_FIXTURE = '100'

const idsIn = ({ users }: UserListResponse): number[] => users.map((user) => user.id)

const base64url = (payload: unknown): string =>
  Buffer.from(JSON.stringify(payload)).toString('base64url')

const decode = (cursor: string): unknown =>
  JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))

const expectError = async (query: string, code: ErrorCode): Promise<ApiErrorBody> => {
  const response = await server.request.get(`/api/users?${query}`).expect(400)
  const body = response.body as ApiErrorBody

  expect(body.error.code).toBe(code)
  return body
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the limit', () => {
  it('defaults to 50 when absent', async () => {
    expect((await server.listUsers()).users).toHaveLength(50)
  })

  it.each(['1', '7', '100'])('accepts %s', async (limit) => {
    const response = await server.listUsers({ limit })

    expect(response.users).toHaveLength(Math.min(Number(limit), FIXTURE_SIZE))
  })

  /* Clamping is a silent correction the client cannot observe, and it splits
     the rule into "some invalid input errors, some is quietly fixed". */
  it.each([
    ['zero', 'limit=0'],
    ['negative', 'limit=-1'],
    ['above the ceiling', 'limit=101'],
    ['fractional', 'limit=1.5'],
    ['not a number', 'limit=abc'],
    ['empty', 'limit='],
    ['repeated', 'limit=5&limit=9'],
  ])('400s on a %s limit rather than clamping it', async (_case, query) => {
    const body = await expectError(query, 'INVALID_QUERY')

    expect(body.error.details).toEqual([{ field: 'limit', message: expect.any(String) }])
  })
})

describe('page_info', () => {
  it('reports more remain and mints a cursor on a non-final page', async () => {
    const response = await server.listUsers({ limit: PAGE_SIZE })

    expect(response.users).toHaveLength(7)
    expect(response.page_info).toEqual({ has_more: true, next_cursor: expect.any(String) })
  })

  it('reports nothing more, with a null cursor, when the page holds everything', async () => {
    const response = await server.listUsers({ limit: WHOLE_FIXTURE })

    expect(response.users).toHaveLength(FIXTURE_SIZE)
    expect(response.page_info).toEqual({ has_more: false, next_cursor: null })
  })

  /* The extra row is the whole mechanism: a second `COUNT` over the same
     predicate would double the work to answer a question one row settles. */
  it('derives has_more from one extra row rather than a second COUNT', async () => {
    const prepared = vi.spyOn(server.db.$client, 'prepare')

    const response = await server.listUsers({ limit: PAGE_SIZE })

    expect(response.page_info.has_more).toBe(true)
    /* One statement for the page, one for its hobbies. A COUNT would be a third. */
    expect(prepared).toHaveBeenCalledTimes(2)
    expect(prepared.mock.calls.map(([sql]) => sql).join('\n')).not.toMatch(/count\s*\(/i)
  })
})

describe('the cursor', () => {
  it('is opaque base64url over the sort, the direction, the value and the id', async () => {
    const response = await server.listUsers({ sort: 'age', dir: 'desc', limit: '3' })
    const cursor = response.page_info.next_cursor ?? ''
    const last = response.users.at(-1)

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decode(cursor)).toEqual({ sort: 'age', dir: 'desc', value: last?.age, id: last?.id })
  })

  it('resumes immediately after the row it was minted from', async () => {
    const first = await server.listUsers({ sort: 'age', limit: PAGE_SIZE })
    const second = await server.listUsers({
      sort: 'age',
      limit: PAGE_SIZE,
      cursor: first.page_info.next_cursor ?? '',
    })
    const whole = idsIn(await server.listUsers({ sort: 'age', limit: WHOLE_FIXTURE }))

    expect(idsIn(second)).toEqual(whole.slice(7, 14))
  })

  /* A cursor names a row, not a page — so it has to keep working across an
     unrelated change of filter, which is what makes the seek a predicate rather
     than an offset into a remembered result. */
  it('rides on top of the filter predicate', async () => {
    const first = await server.listUsers({ nationalities: ['Germany'], sort: 'age', limit: '2' })
    const second = await server.listUsers({
      nationalities: ['Germany'],
      sort: 'age',
      limit: '2',
      cursor: first.page_info.next_cursor ?? '',
    })

    /* Germany by age ascending: Zoë 27, Jonas 29, Lukas 34, Greta 34, Anna 41. */
    expect(idsIn(first)).toEqual([6, 3])
    expect(idsIn(second)).toEqual([1, 4])
  })
})

/* The guarantee offset pagination has no equivalent for: a stale cursor is a
   400 rather than silently wrong rows. */
describe('a cursor replayed under a different sort', () => {
  const cursorMintedUnder = async (params: QueryParams): Promise<string> => {
    const response = await server.listUsers({ ...params, limit: '5' })
    return response.page_info.next_cursor ?? ''
  }

  it('is a CURSOR_SORT_MISMATCH when the field changed', async () => {
    const cursor = await cursorMintedUnder({ sort: 'age', dir: 'asc' })

    await expectError(
      `sort=last_name&dir=asc&cursor=${encodeURIComponent(cursor)}`,
      'CURSOR_SORT_MISMATCH',
    )
  })

  it('is a CURSOR_SORT_MISMATCH when only the direction changed', async () => {
    const cursor = await cursorMintedUnder({ sort: 'age', dir: 'asc' })

    await expectError(
      `sort=age&dir=desc&cursor=${encodeURIComponent(cursor)}`,
      'CURSOR_SORT_MISMATCH',
    )
  })

  /* Minted under the defaults, replayed with them spelled out — the same sort,
     so this one has to pass. */
  it('is accepted when the sort is the same one spelled explicitly', async () => {
    const cursor = await cursorMintedUnder({})

    const response = await server.listUsers({
      sort: 'last_name',
      dir: 'asc',
      limit: '5',
      cursor,
    })

    expect(response.users).toHaveLength(5)
  })
})

const VALID_PAYLOAD = { sort: 'last_name', dir: 'asc', value: 'Braun', id: 5 }

describe('a malformed cursor', () => {
  it.each([
    ['is not base64url at all', 'not a cursor!!'],
    ['is empty', ''],
    ['decodes to something that is not JSON', Buffer.from('nonsense').toString('base64url')],
    ['decodes to a JSON string rather than an object', base64url('Braun')],
    ['is missing its id', base64url({ sort: 'last_name', dir: 'asc', value: 'Braun' })],
    ['names a sort field that is not one', base64url({ ...VALID_PAYLOAD, sort: 'nickname' })],
    ['names a direction that is not one', base64url({ ...VALID_PAYLOAD, dir: 'sideways' })],
    ['carries a key the minter never wrote', base64url({ ...VALID_PAYLOAD, offset: 50 })],
    /* A text value against `age` would be compared under integer affinity and
       quietly match everything. */
    ['carries a value of the wrong type for its sort field', base64url({ ...VALID_PAYLOAD, value: 42 })],
    ['carries an id that is not a whole number', base64url({ ...VALID_PAYLOAD, id: 1.5 })],
  ])('is a 400 INVALID_CURSOR when it %s', async (_case, cursor) => {
    await expectError(`cursor=${encodeURIComponent(cursor)}`, 'INVALID_CURSOR')
  })
})

/* The acceptance test for the whole ticket: a caller can walk the entire result
   set through an imposed order without ever seeing a duplicate or missing a
   person. */
describe('walking the cursor to exhaustion', () => {
  const walk = async (params: QueryParams) => {
    const ids: number[] = []
    let cursor: string | null = null
    let pages = 0

    do {
      const page: UserListResponse = await server.listUsers(
        cursor === null ? params : { ...params, cursor },
      )
      ids.push(...idsIn(page))
      cursor = page.page_info.next_cursor
      pages += 1
      if (pages > 20) throw new Error('the walk did not terminate')
    } while (cursor !== null)

    return { ids, pages }
  }

  it.each([
    ['a heavily tied sort', { sort: 'age', dir: 'asc' }],
    ['a sort with no ties at all', { sort: 'last_name', dir: 'desc' }],
  ])('yields the unpaginated result exactly once, in order: %s', async (_case, sortParams) => {
    const { ids, pages } = await walk({ ...sortParams, limit: PAGE_SIZE })
    const unpaginated = idsIn(await server.listUsers({ ...sortParams, limit: WHOLE_FIXTURE }))

    /* 60 rows at 7 a page: eight full pages and a short ninth. */
    expect(pages).toBe(9)
    expect(new Set(ids).size).toBe(FIXTURE_SIZE)
    expect(ids).toEqual(unpaginated)
  })

  it('walks a filtered result set the same way', async () => {
    const filters = { nationalities: ['Germany', 'Turkey'], sort: 'first_name', dir: 'desc' }
    const { ids } = await walk({ ...filters, limit: '3' })

    expect(ids).toEqual(idsIn(await server.listUsers({ ...filters, limit: WHOLE_FIXTURE })))
    expect(ids).toHaveLength(11)
  })
})

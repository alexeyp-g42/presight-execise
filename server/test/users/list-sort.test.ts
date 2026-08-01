import {
  DEFAULT_DIR,
  DEFAULT_SORT,
  SORT_DIRS,
  SORT_FIELDS,
  type SortDir,
  type SortField,
  type UserListResponse,
} from '@presight/shared'
import { describe, expect, it } from 'vitest'
import type { ApiErrorBody } from '../../src/http/api-error.ts'
import { DIRECTORY, type FixtureUser, seedDirectoryFixture } from '../support/directory-fixture.ts'
import { createTestServer } from '../support/test-server.ts'

/* Sort, through real HTTP against the hand-authored fixture. `list-users.test.ts`
   owns *which* people come back; this file owns the order they come back in.
 *
 * Every expectation is checked against a comparator built below rather than
 * against a second query — an expectation computed the way the endpoint
 * computes it proves only that the endpoint agrees with itself. */

const server = createTestServer({ seed: seedDirectoryFixture })

/* The whole fixture in one page: 60 rows, under the 100-row ceiling. The
   assertions below are then the complete order rather than its first 50. */
const WHOLE_FIXTURE = '100'

const idsIn = ({ users }: UserListResponse): number[] => users.map((user) => user.id)

/* SQLite compares text under BINARY — byte order, which agrees with JavaScript's
   `<` for every character below U+10000, and no name in the fixture reaches it.
   Numbers are compared numerically, so `age` 9 sorts before 10 rather than
   after it, which a `String()` comparison would get wrong. */
const compareValues = (left: string | number, right: string | number): number => {
  if (typeof left === 'number' && typeof right === 'number') return left - right
  if (String(left) === String(right)) return 0
  return String(left) < String(right) ? -1 : 1
}

/* `sign` multiplies the tie-break as well as the value, which is the whole
   claim: `id` follows the sort's own direction rather than staying ascending. */
const comparing =
  (sort: SortField, dir: SortDir) =>
  (left: FixtureUser, right: FixtureUser): number => {
    const sign = dir === 'asc' ? 1 : -1
    return sign * (compareValues(left[sort], right[sort]) || left.id - right.id)
  }

const expectedOrder = (sort: SortField, dir: SortDir): number[] =>
  DIRECTORY.toSorted(comparing(sort, dir)).map((user) => user.id)

describe('sorting the directory', () => {
  /* All 8 permutations, because a sign flipped in the tie-break or a column
     read from the wrong map shows up in exactly one of them. */
  for (const sort of SORT_FIELDS) {
    for (const dir of SORT_DIRS) {
      it(`orders the whole directory by ${sort} ${dir}`, async () => {
        const response = await server.listUsers({ sort, dir, limit: WHOLE_FIXTURE })

        expect(idsIn(response)).toEqual(expectedOrder(sort, dir))
      })
    }
  }

  it('sorts the filtered result set rather than the whole directory', async () => {
    const response = await server.listUsers({
      nationalities: ['Norway'],
      sort: 'age',
      dir: 'desc',
    })

    /* Ole Nordvik is 61, Bjørn Halvorsen 47, Ingrid Solberg 34. */
    expect(idsIn(response)).toEqual([14, 12, 13])
  })
})

describe('the default sort', () => {
  it('is last name ascending when the params are absent', async () => {
    expect(idsIn(await server.listUsers())).toEqual(expectedOrder('last_name', 'asc').slice(0, 50))
  })

  /* The client falls back to the same pair without a request when it meets a
     hand-edited `?sort=nickname`, so the two cannot disagree about what "no
     sort" means only because both read it from the contract package. */
  it('is the pair the contract package publishes', async () => {
    expect(await server.listUsers()).toEqual(
      await server.listUsers({ sort: DEFAULT_SORT, dir: DEFAULT_DIR }),
    )
  })
})

/* Nine people share age 34 — enough that an unstable order would be visible
   rather than lucky. */
const AGED_34 = [1, 4, 7, 13, 22, 30, 35, 45, 60]

describe('the id tie-breaker', () => {
  const agedThirtyFourIn = (ids: number[]) => ids.filter((id) => AGED_34.includes(id))

  it('follows the sort ascending, so equal ages come back in id order', async () => {
    const ids = idsIn(await server.listUsers({ sort: 'age', dir: 'asc', limit: WHOLE_FIXTURE }))

    expect(agedThirtyFourIn(ids)).toEqual(AGED_34)
  })

  /* Not `id ASC` under a descending sort, which would be equally deterministic
     and would need four more indexes to stay temp-B-tree-free. */
  it('follows the sort descending, so equal ages come back in reverse id order', async () => {
    const ids = idsIn(await server.listUsers({ sort: 'age', dir: 'desc', limit: WHOLE_FIXTURE }))

    expect(agedThirtyFourIn(ids)).toEqual(AGED_34.toReversed())
  })

  it('makes the same request twice byte-identical', async () => {
    const path = '/api/users?sort=age&dir=desc&limit=25'
    const once = await server.request.get(path).expect(200)
    const twice = await server.request.get(path).expect(200)

    expect(once.text).toBe(twice.text)
  })
})

/* Two params rather than one `sort=age:desc`, matching the brief's "controls for
   choosing sort field and sort direction" 1:1 — which is what lets a bad field
   and a bad direction be told apart. */
describe('sort validation', () => {
  const expectInvalidQuery = async (query: string): Promise<ApiErrorBody> => {
    const response = await server.request.get(`/api/users?${query}`).expect(400)
    const body = response.body as ApiErrorBody

    expect(body.error.code).toBe('INVALID_QUERY')
    return body
  }

  it('names `sort` when the field is not one of the four', async () => {
    const body = await expectInvalidQuery('sort=nickname')

    expect(body.error.details).toEqual([{ field: 'sort', message: expect.any(String) }])
  })

  it('names `dir` when the direction is neither asc nor desc', async () => {
    const body = await expectInvalidQuery('dir=sideways')

    expect(body.error.details).toEqual([{ field: 'dir', message: expect.any(String) }])
  })

  it('reports both when both are wrong, rather than stopping at the first', async () => {
    const body = await expectInvalidQuery('sort=nickname&dir=sideways')

    expect(body.error.details).toEqual([
      { field: 'sort', message: expect.any(String) },
      { field: 'dir', message: expect.any(String) },
    ])
  })

  /* A sort field the *database* has but the contract does not. Rejecting it is
     what stops `search_name` — deliberately unindexed — from being sortable. */
  it('rejects a real column that is not a sort field', async () => {
    await expectInvalidQuery('sort=search_name')
  })

  it('rejects a direction spelled the SQL way', async () => {
    await expectInvalidQuery('dir=ASC')
  })
})

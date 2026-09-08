import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, fetchFacets, fetchUsers, toSearchParams } from '../src/api/client'
import type { FilterState } from '../src/api/types'

const base: FilterState = {
  q: '',
  nationalities: [],
  hobbies: [],
  sort: 'first_name',
  order: 'asc',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(response: unknown, status = 200) {
  const spy = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => response,
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

describe('toSearchParams', () => {
  it('omits defaults so a pristine URL stays clean', () => {
    expect(toSearchParams(base).toString()).toBe('')
  })

  it('includes the text filter when present', () => {
    expect(toSearchParams({ ...base, q: 'ada' }).get('q')).toBe('ada')
  })

  it('repeats multi-value parameters', () => {
    const params = toSearchParams({ ...base, nationalities: ['British', 'Japanese'] })

    expect(params.getAll('nationalities')).toEqual(['British', 'Japanese'])
  })

  it('includes sort and order only when they differ from the defaults', () => {
    expect(toSearchParams({ ...base, sort: 'age' }).get('sort')).toBe('age')
    expect(toSearchParams({ ...base, order: 'desc' }).get('order')).toBe('desc')
  })

  it('merges extra parameters', () => {
    expect(toSearchParams(base, { limit: '30' }).get('limit')).toBe('30')
  })
})

describe('fetchUsers', () => {
  it('requests the users endpoint with the filter state', async () => {
    const spy = stubFetch({ items: [], pageInfo: { nextCursor: null, hasMore: false } })
    await fetchUsers({ ...base, q: 'ada' }, null)

    expect(spy.mock.calls[0][0]).toContain('/api/users?')
    expect(spy.mock.calls[0][0]).toContain('q=ada')
  })

  it('passes the cursor when one is given', async () => {
    const spy = stubFetch({ items: [], pageInfo: { nextCursor: null, hasMore: false } })
    await fetchUsers(base, 'abc123')

    expect(spy.mock.calls[0][0]).toContain('cursor=abc123')
  })

  it('throws an ApiError carrying the status on failure', async () => {
    stubFetch({ error: { code: 'INVALID_QUERY', message: 'bad', field: 'sort' } }, 400)

    await expect(fetchUsers(base, null)).rejects.toBeInstanceOf(ApiError)
  })
})

describe('fetchFacets', () => {
  it('requests the facets endpoint', async () => {
    const spy = stubFetch({ total: 0, hobbies: [], nationalities: [] })
    await fetchFacets(base)

    expect(spy.mock.calls[0][0]).toContain('/api/facets?')
  })
})

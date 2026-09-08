import { describe, expect, it } from 'vitest'
import { parsePageRequest, type PageRequest } from '../src/query/filters.js'
import { queryUsers } from '../src/query/users.js'
import { createFixtureDb } from './fixture.js'

function idsFor(query: Record<string, unknown>): number[] {
  return queryUsers(createFixtureDb(), parsePageRequest(query)).items.map((user) => user.id)
}

function walkAllPages(query: Record<string, unknown>): number[] {
  const db = createFixtureDb()
  const collected: number[] = []
  let request: PageRequest = parsePageRequest(query)

  for (let guard = 0; guard < 50; guard += 1) {
    const page = queryUsers(db, request)
    collected.push(...page.items.map((user) => user.id))
    if (!page.pageInfo.hasMore) {
      return collected
    }
    request = parsePageRequest({ ...query, cursor: page.pageInfo.nextCursor })
  }

  throw new Error('pagination did not terminate')
}

describe('queryUsers', () => {
  it('sorts by first name ascending with id as tie-breaker', () => {
    expect(idsFor({ sort: 'first_name', order: 'asc' })).toEqual([1, 3, 2, 8, 4, 6, 5, 7])
  })

  it('sorts by age ascending with id as tie-breaker', () => {
    expect(idsFor({ sort: 'age', order: 'asc' })).toEqual([6, 1, 3, 8, 2, 7, 4, 5])
  })

  it('sorts by age descending with id descending as tie-breaker', () => {
    expect(idsFor({ sort: 'age', order: 'desc' })).toEqual([5, 4, 7, 2, 8, 3, 1, 6])
  })

  it('sorts by last name ascending', () => {
    expect(idsFor({ sort: 'last_name', order: 'asc' })).toEqual([1, 4, 5, 6, 8, 3, 7, 2])
  })

  it('sorts by nationality ascending with id as tie-breaker', () => {
    expect(idsFor({ sort: 'nationality', order: 'asc' })).toEqual([4, 5, 7, 8, 6, 1, 2, 3])
  })

  it('attaches every hobby to each user', () => {
    const page = queryUsers(createFixtureDb(), parsePageRequest({ sort: 'first_name' }))
    const ada = page.items.find((user) => user.id === 1)

    expect(ada?.hobbies.sort()).toEqual(['Astronomy', 'Chess', 'Weaving'])
  })

  it('returns an empty hobby list for a user with none', () => {
    const db = createFixtureDb()
    db.prepare('DELETE FROM user_hobbies WHERE user_id = 1').run()
    const page = queryUsers(db, parsePageRequest({ sort: 'first_name' }))

    expect(page.items.find((user) => user.id === 1)?.hobbies).toEqual([])
  })

  it('reports hasMore when the result exceeds the limit', () => {
    const page = queryUsers(createFixtureDb(), parsePageRequest({ limit: '3' }))

    expect(page.items).toHaveLength(3)
    expect(page.pageInfo.hasMore).toBe(true)
    expect(page.pageInfo.nextCursor).not.toBeNull()
  })

  it('reports no more pages on the final page', () => {
    const page = queryUsers(createFixtureDb(), parsePageRequest({ limit: '100' }))

    expect(page.pageInfo.hasMore).toBe(false)
    expect(page.pageInfo.nextCursor).toBeNull()
  })

  it.each([
    ['first_name', 'asc'],
    ['first_name', 'desc'],
    ['last_name', 'asc'],
    ['last_name', 'desc'],
    ['age', 'asc'],
    ['age', 'desc'],
    ['nationality', 'asc'],
    ['nationality', 'desc'],
  ])('paginates %s %s without duplicates or omissions', (sort, order) => {
    const paged = walkAllPages({ sort, order, limit: '3' })
    const whole = idsFor({ sort, order, limit: '100' })

    expect(paged).toEqual(whole)
    expect(new Set(paged).size).toBe(8)
  })

  it('paginates a filtered result set consistently', () => {
    const query = { hobbies: ['Chess'], sort: 'age', order: 'asc', limit: '2' }
    const paged = walkAllPages(query)

    expect(paged).toEqual([6, 1, 3, 2, 7, 4])
  })

  it('returns an empty page when nothing matches', () => {
    const page = queryUsers(createFixtureDb(), parsePageRequest({ q: 'zzz' }))

    expect(page.items).toEqual([])
    expect(page.pageInfo.hasMore).toBe(false)
  })
})

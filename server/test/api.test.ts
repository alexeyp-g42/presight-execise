import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createFixtureDb } from './fixture.js'

const app = () => createApp(createFixtureDb())

describe('GET /api/users', () => {
  it('returns the first page with pagination metadata', async () => {
    const response = await request(app()).get('/api/users').query({ limit: 3 })

    expect(response.status).toBe(200)
    expect(response.body.items).toHaveLength(3)
    expect(response.body.pageInfo.hasMore).toBe(true)
    expect(typeof response.body.pageInfo.nextCursor).toBe('string')
  })

  it('returns full user records', async () => {
    const response = await request(app()).get('/api/users').query({ q: 'Barbara' })

    expect(response.body.items[0]).toEqual({
      id: 8,
      avatar: 'avatar/Liskov',
      first_name: 'Barbara',
      last_name: 'Liskov',
      age: 36,
      nationality: 'American',
      hobbies: ['Running'],
    })
  })

  it('follows a cursor to the next page', async () => {
    const first = await request(app()).get('/api/users').query({ sort: 'age', limit: 3 })
    const second = await request(app())
      .get('/api/users')
      .query({ sort: 'age', limit: 3, cursor: first.body.pageInfo.nextCursor })

    expect(second.body.items.map((user: { id: number }) => user.id)).toEqual([8, 2, 7])
  })

  it('accepts repeated filter parameters', async () => {
    const response = await request(app()).get(
      '/api/users?nationalities=British&nationalities=Austrian',
    )

    expect(response.body.items).toHaveLength(4)
  })

  it('rejects a sort field outside the whitelist', async () => {
    const response = await request(app()).get('/api/users').query({ sort: 'id; DROP TABLE users' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_QUERY')
    expect(response.body.error.field).toBe('sort')
  })

  it('rejects an out-of-range limit', async () => {
    const response = await request(app()).get('/api/users').query({ limit: 5000 })

    expect(response.status).toBe(400)
    expect(response.body.error.field).toBe('limit')
  })

  it('rejects a malformed cursor', async () => {
    const response = await request(app()).get('/api/users').query({ cursor: 'garbage' })

    expect(response.status).toBe(400)
    expect(response.body.error.field).toBe('cursor')
  })

  it('rejects a repeated sort parameter', async () => {
    const response = await request(app()).get('/api/users?sort=first_name&sort=age')

    expect(response.status).toBe(400)
    expect(response.body.error.field).toBe('sort')
  })
})

describe('GET /api/facets', () => {
  it('returns totals and both facet lists', async () => {
    const response = await request(app()).get('/api/facets')

    expect(response.status).toBe(200)
    expect(response.body.total).toBe(8)
    expect(response.body.nationalities[0]).toEqual({ value: 'American', count: 4 })
    expect(response.body.hobbies[0]).toEqual({ value: 'Chess', count: 6 })
  })

  it('reflects the active filters', async () => {
    const response = await request(app()).get('/api/facets').query({ q: 'ad' })

    expect(response.body.total).toBe(2)
    expect(response.body.nationalities).toEqual([{ value: 'British', count: 2 }])
  })

  it('rejects an invalid order', async () => {
    const response = await request(app()).get('/api/facets').query({ order: 'sideways' })

    expect(response.status).toBe(400)
  })
})

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const response = await request(app()).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})

describe('createApp with a client directory', () => {
  it('constructs without throwing', () => {
    expect(() => createApp(createFixtureDb(), { clientDir: '/tmp/does-not-exist' })).not.toThrow()
  })

  it('still serves the API', async () => {
    const withClient = createApp(createFixtureDb(), { clientDir: '/tmp/does-not-exist' })
    const response = await request(withClient).get('/api/health')

    expect(response.status).toBe(200)
  })
})

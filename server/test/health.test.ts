import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoDatabaseQuery } from './support/expect-no-database-query.ts'
import { createTestServer } from './support/test-server.ts'

const server = createTestServer()

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/health', () => {
  it('answers 200 with a status body', async () => {
    expect(await server.getHealth()).toEqual({ status: 'ok' })
  })

  /* The container's healthcheck is this endpoint. If it queried the database, a
     healthy-but-unseeded container and a container whose database is gone would
     look identical — and the seed runs *before* the server, so on a first boot
     the tables briefly do not exist at all. */
  it('issues no database query', async () => {
    await expectNoDatabaseQuery(server.db, () => server.getHealth())
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
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
     the tables briefly do not exist at all. Asserted at the driver, so a query
     added through any layer trips it. */
  it('issues no database query', async () => {
    const prepare = vi.spyOn(server.db.$client, 'prepare')
    const exec = vi.spyOn(server.db.$client, 'exec')
    const pragma = vi.spyOn(server.db.$client, 'pragma')

    await server.getHealth()

    expect(prepare).not.toHaveBeenCalled()
    expect(exec).not.toHaveBeenCalled()
    expect(pragma).not.toHaveBeenCalled()
  })
})

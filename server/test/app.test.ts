import { describe, expect, it } from 'vitest'
import { createTestServer } from './support/test-server.ts'

const server = createTestServer()

describe('createApp', () => {
  /* The factory exists so the suite can point an app at a throwaway database —
     the seam the whole server suite is built on. The listening bootstrap lives
     in `src/index.ts` and is deliberately not part of it, so no test ever binds
     a port. */
  it('builds an app around the handle it is given', () => {
    expect(server.app.locals.db).toBe(server.db)
  })

  it('does not advertise the framework', async () => {
    const response = await server.request.get('/api/health').expect(200)

    expect(response.headers['x-powered-by']).toBeUndefined()
  })
})

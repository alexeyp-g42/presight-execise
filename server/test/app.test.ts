import { describe, expect, it } from 'vitest'
import { createTestServer } from './support/test-server.ts'

const server = createTestServer()

describe('createApp', () => {
  /* The factory exists so the suite can point a whole app at a throwaway
     database — the seam every server ticket from here on is built on. The
     listening bootstrap lives in `src/index.ts` and is deliberately not part of
     it, so no test ever binds a port. */
  it('builds an app around the handle it is given', () => {
    expect(server.app.locals.db).toBe(server.db)
  })

  it('mounts the API under /api', async () => {
    await server.request.get('/api/health').expect(200)
    await server.request.get('/health').expect(404)
  })
})

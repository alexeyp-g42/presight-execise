import express, { type RequestHandler } from 'express'
import supertest from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, type ApiErrorBody } from '../src/http/api-error.ts'
import { errorHandler, notFoundHandler } from '../src/http/error-handler.ts'
import { createTestServer } from './support/test-server.ts'

const server = createTestServer()

/* One middleware serves every route, so the failing routes are mounted here
   rather than waiting for endpoints that can produce each code. The wiring
   under test is the real thing — the same two handlers `createApp` installs. */
const appThatFailsWith = (fail: RequestHandler) => {
  const app = express()
  app.get('/fail', fail)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return supertest(app)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the error envelope', () => {
  it('turns an unknown route into a 404, on the real app', async () => {
    const response = await server.request.get('/api/nope').expect(404)

    expect(response.body as ApiErrorBody).toEqual({
      error: { code: 'NOT_FOUND', message: expect.stringContaining('/api/nope') },
    })
  })

  /* Validation is a `ZodError` at the query-string boundary — the shape #19
     onwards produces. The envelope carries a stable machine-readable code and
     field/message pairs; Zod's own `flatten()` was rejected, since it leaks the
     validation library's shape into the public contract. */
  it('turns a validation failure into a 400 with per-field details', async () => {
    const query = z.object({ sort: z.enum(['first_name', 'last_name']) })
    const request = appThatFailsWith((req) => {
      query.parse(req.query)
    })

    const response = await request.get('/fail?sort=birthday').expect(400)

    expect(response.body as ApiErrorBody).toEqual({
      error: {
        code: 'INVALID_QUERY',
        message: expect.any(String),
        details: [{ field: 'sort', message: expect.any(String) }],
      },
    })
  })

  it('carries the code and status of an ApiError through unchanged', async () => {
    const request = appThatFailsWith(() => {
      throw new ApiError(400, 'CURSOR_SORT_MISMATCH', 'This cursor was minted under a different sort')
    })

    const response = await request.get('/fail').expect(400)

    expect(response.body as ApiErrorBody).toEqual({
      error: {
        code: 'CURSOR_SORT_MISMATCH',
        message: 'This cursor was minted under a different sort',
      },
    })
  })

  it('rejects a rejected promise the same way, with no async wrapper in the route', async () => {
    const request = appThatFailsWith(async () => {
      await Promise.resolve()
      throw new ApiError(400, 'INVALID_CURSOR', 'Malformed cursor')
    })

    const response = await request.get('/fail').expect(400)

    expect((response.body as ApiErrorBody).error.code).toBe('INVALID_CURSOR')
  })

  it('answers an unexpected failure with a 500 that leaks no stack and no internals', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const request = appThatFailsWith(() => {
      throw new Error('connection to the credentials service at 10.0.0.7 failed')
    })

    const response = await request.get('/fail').expect(500)

    expect(response.body as ApiErrorBody).toEqual({
      error: { code: 'INTERNAL', message: expect.any(String) },
    })
    expect(response.text).not.toContain('10.0.0.7')
    expect(response.text).not.toContain('at ')
    expect(response.text).not.toContain('error-envelope.test')
    /* Swallowed for the client, not for the operator. */
    expect(logged).toHaveBeenCalledOnce()
  })
})

import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { ApiErrorBody } from '../src/http/api-error.ts'
import { BUNDLE_URL, createClientBuild, SHELL_MARKER } from './support/client-build.ts'
import { createTestServer } from './support/test-server.ts'

/* The static half of "one image, one origin". These run against a throwaway
   build directory rather than `client/dist`, so the suite never depends on a
   bundler having been run — the same seam `createTestServer` already gives the
   database, one layer out. */

const build = createClientBuild()

afterAll(() => {
  build.remove()
})

const served = createTestServer({ clientDir: build.dir })

/* The dev loop and every other test file: an app whose `clientDir` is not on
   disk. Nothing here may be served, and every path must fall through to the
   same 404 envelope the API answers in. */
const apiOnly = createTestServer({ clientDir: join(build.dir, 'not-a-build') })

const errorOf = (body: unknown) => (body as ApiErrorBody).error

describe('the built client, served from the API’s own origin', () => {
  it('answers / with the shell', async () => {
    const response = await served.request.get('/').expect(200)

    expect(response.headers['content-type']).toMatch(/^text\/html/)
    expect(response.text).toContain(SHELL_MARKER)
  })

  /* Vite content-hashes everything under `assets/`, so the file behind a given
     URL can never change — the same reasoning, and the same header, as the
     avatar route. */
  it('caches a hashed bundle for a year, immutably', async () => {
    const response = await served.request.get(BUNDLE_URL).expect(200)

    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable')
  })

  /* The shell is the one file Vite does not hash, and it is what names the
     current bundle. Cached without revalidation it would keep pointing a
     returning viewer at a bundle the next deploy deleted. */
  it.each([
    ['the shell', '/'],
    ['an unhashed asset', '/favicon.svg'],
  ])('leaves %s revalidating', async (_case, path) => {
    const response = await served.request.get(path).expect(200)

    expect(response.headers['cache-control']).toBe('no-cache')
  })

  /* What makes a shared URL work: the view state lives in the query string, so
     the shell has to come back for whatever path the browser asks for. */
  it('hands the shell back for a path that matches no file', async () => {
    const response = await served.request.get('/some/deep/link').expect(200)

    expect(response.text).toContain(SHELL_MARKER)
  })

  /* The one place this could go wrong quietly: a client asking for JSON and
     getting a 200 of HTML back, which reads as a parse bug rather than a 404.
     `createApp` puts the envelope in front of the client rather than teaching
     the client about `/api`, so placement is the guarantee. */
  it.each([
    ['an unknown API path', '/api/nope'],
    ['the API prefix itself', '/api'],
    ['a path that looks like an avatar but names none', '/api/avatars/.svg'],
  ])('leaves %s to the error envelope, never the shell', async (_case, path) => {
    const response = await served.request.get(path).expect(404)

    expect(errorOf(response.body).code).toBe('NOT_FOUND')
    expect(response.text).not.toContain(SHELL_MARKER)
  })

  /* A fetch of a document is what the fallback exists for. Anything else that
     matched nothing is an ordinary 404 — this API has no write path at all, so
     a POST reaching here is a client bug and should read as one. */
  it('leaves a non-GET that matched nothing to the error envelope', async () => {
    const response = await served.request.post('/some/deep/link').expect(404)

    expect(errorOf(response.body).code).toBe('NOT_FOUND')
  })

  it('still answers the API', async () => {
    expect(await served.getHealth()).toEqual({ status: 'ok' })
  })
})

describe('an app with no client build on disk', () => {
  /* Checked once at boot, not per request — so a directory that appears later
     changes nothing until the process restarts, which is the container's
     lifecycle anyway. */
  it('serves nothing, leaving every path to the 404 envelope', async () => {
    for (const path of ['/', '/favicon.svg', '/some/deep/link']) {
      const response = await apiOnly.request.get(path).expect(404)
      expect(errorOf(response.body).code).toBe('NOT_FOUND')
    }
  })

  it('still answers the API', async () => {
    expect(await apiOnly.getHealth()).toEqual({ status: 'ok' })
  })
})

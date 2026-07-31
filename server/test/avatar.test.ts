import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import type { Request, Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApiErrorBody } from '../src/http/api-error.ts'
import { avatarHandler } from '../src/routes/avatar.ts'
import { expectNoDatabaseQuery } from './support/expect-no-database-query.ts'
import { createTestServer } from './support/test-server.ts'

const server = createTestServer()

/* `.buffer()` because superagent hands an image content type back as a Buffer
   and leaves `response.text` unset. */
const requestAvatar = (id: string) => server.request.get(`/api/avatars/${id}.svg`).buffer()

const svgOf = (body: unknown) => (body as Buffer).toString('utf8')

const getAvatarSvg = async (id: string) => svgOf((await requestAvatar(id).expect(200)).body)

/* Every internal id in the document is suffixed with a hash of the seed, so two
   avatars differ in raw bytes even where the drawing is identical. Strip the
   suffix and what is left is the avatar itself — the variants picked and the
   colours they were filled with — which is what "a distinct avatar" means. */
const artworkOf = (svg: string) => svg.replace(/-[0-9a-f]{8}\b/g, '')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/avatars/:id.svg', () => {
  it('answers with an SVG document under an SVG content type', async () => {
    const response = await requestAvatar('8412').expect(200)

    expect(response.headers['content-type']).toBe('image/svg+xml; charset=utf-8')
    expect(svgOf(response.body)).toMatch(/^<svg[\s>]/)
    expect(svgOf(response.body)).toContain('</svg>')
  })

  it('draws one avatar per id, the same one every time', async () => {
    const [first, again, other] = await Promise.all([
      getAvatarSvg('8412'),
      getAvatarSvg('8412'),
      getAvatarSvg('8413'),
    ])

    expect(again).toBe(first)
    expect(artworkOf(other)).not.toBe(artworkOf(first))
  })

  it('carries the immutable year-long cache header', async () => {
    const response = await requestAvatar('8412').expect(200)

    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable')
  })

  /* The id is the generator's seed, not a lookup key. */
  it('issues no database query', async () => {
    await expectNoDatabaseQuery(server.db, () => getAvatarSvg('8412'))
  })

  /* The consequence of not querying: this route cannot answer "no such user",
     and does not try to. It draws for any id the path can carry, which is what
     lets it serve a request that arrives before the seed script has run. */
  it('draws an id that matches no row, including the far end of the range', async () => {
    expect(await getAvatarSvg('0')).toMatch(/^<svg[\s>]/)
    expect(await getAvatarSvg('9'.repeat(19))).toMatch(/^<svg[\s>]/)
  })

  /* The hard constraint — the reviewer runs this from compose, possibly
     offline — and it can break in two independent places. First: the server
     itself calling DiceBear's HTTP API instead of generating locally.

     Every egress path is watched, not just `fetch`, which means supertest
     cannot be in the loop — it reaches the app over a real socket and would
     trip these itself. So the handler is called directly here; the route around
     it is covered by every other case in this file. */
  it('generates the avatar with no outbound request of any kind', () => {
    const egress = [
      vi.spyOn(globalThis, 'fetch'),
      vi.spyOn(http, 'request'),
      vi.spyOn(https, 'request'),
      vi.spyOn(net, 'connect'),
      vi.spyOn(net.Socket.prototype, 'connect'),
      vi.spyOn(dns, 'lookup'),
    ]

    let sent = ''
    const send = (body: string) => {
      sent = body
    }
    avatarHandler(
      { params: { id: '8412' } } as Request<{ id: string }>,
      { type: () => {}, set: () => {}, send } as unknown as Response,
      () => {},
    )

    expect(sent).toMatch(/^<svg[\s>]/)
    for (const spy of egress) expect(spy).not.toHaveBeenCalled()
  })

  /* Second: handing back a document whose parts the browser then goes and
     fetches, which would fail on the reviewer's machine long after this route
     has answered 200. */
  it('returns a document that references nothing remote', async () => {
    const svg = await getAvatarSvg('8412')

    /* Only the positions a renderer actually resolves — the RDF attribution in
       `<metadata>` carries http URLs as text and nothing ever loads them. */
    const referenced = [...svg.matchAll(/(?:xlink:href|href|src)="([^"]*)"|url\(([^)]*)\)/g)]
      .map(([, attribute, functional]) => attribute ?? functional)
      .filter((reference) => reference !== undefined)
    expect(referenced.length).toBeGreaterThan(0)
    expect(referenced.filter((reference) => !reference.startsWith('#'))).toEqual([])
  })

  /* A 404 in the ordinary envelope, not a 500 and not an SVG: the route is an
     exception in what it returns on success, not in how it fails. See
     `routes/avatar.ts` for why "any id draws" stops at the shape of a user id. */
  it.each([
    ['a non-numeric id', 'abc'],
    ['a negative id', '-1'],
    ['a decimal id', '1.5'],
    ['an id longer than any row can hold', '9'.repeat(2000)],
    ['an id carrying escaped punctuation and diacritics', encodeURIComponent('Özcan «/»')],
    /* Not reached by the shape check above — Express decodes path parameters
       while matching, so a broken escape throws before the handler runs. It is
       the error envelope that keeps this off 500; see `error-envelope.test.ts`. */
    ['an id whose percent-escape is broken', '%zz'],
  ])('turns %s into a 404 rather than a 500', async (_case, id) => {
    const response = await requestAvatar(id).expect(404)

    expect((response.body as ApiErrorBody).error.code).toBe('NOT_FOUND')
  })

  it('leaves a path that names no avatar at all to the same envelope', async () => {
    const response = await server.request.get('/api/avatars/.svg').expect(404)

    expect((response.body as ApiErrorBody).error.code).toBe('NOT_FOUND')
  })
})

import supertest from 'supertest'
import { afterAll, beforeAll, expect } from 'vitest'
import type { Express } from 'express'
import type { FacetsResponse, UserListResponse } from '@presight/shared'
import { createApp } from '../../src/app.ts'
import type { HealthResponse } from '../../src/feature/health/api/health-handler.ts'
import type { Db } from '../../src/shared/db/open-db.ts'
import { ERROR_STATUS, type ApiErrorBody, type ErrorCode } from '../../src/shared/http/api-error.ts'
import { createMigratedDatabase, type MigratedDatabase } from './temp-database.ts'

/* Server seam 1, used by every server test from here on: supertest over the app
   factory, pointed at a fresh temp-file database built once per test file.

   Once per file rather than once per test, because everything under test is a
   read query and nothing mutates — per-test isolation would buy nothing and
   cost a migration per case. Tests go through real HTTP rather than calling
   handlers directly, because query-string decoding is exactly where the filter
   semantics get broken silently. */

export type TestServerOptions = {
  /** Runs after the migrations, against the same handle the app is given. */
  seed?: (db: Db) => void
  /**
   * The built client to serve. Left out, the app resolves `server/public`,
   * which exists only inside the image — so every other test file gets an
   * API-only app, which is what the dev loop runs too.
   */
  clientDir?: string
}

/** One value or several under the same key — never a comma-joined string. */
export type QueryParams = Record<string, string | string[]>

/* Built here rather than through supertest's `.query()`, because the wire form
   *is* the contract: repeated keys, and percent-encoding that leaves a comma or
   a space inside a single value intact. A serialiser that quietly switched to
   `hobbies[]=` or to comma-joining would be the exact bug these tests exist to
   catch, and it would catch it in the assertion rather than in the request. */
export const toQueryString = (params: QueryParams): string => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) search.append(key, item)
  }
  return search.toString()
}

export type TestServer = {
  readonly app: Express
  readonly db: Db
  readonly request: supertest.Agent
  /** Typed request helpers. Test bodies read as data in, data out. */
  getHealth: () => Promise<HealthResponse>
  /** A 200 from the list endpoint. Failures go through `expectListError`. */
  listUsers: (params?: QueryParams) => Promise<UserListResponse>
  /** A 200 from the facets endpoint. */
  getFacets: (params?: QueryParams) => Promise<FacetsResponse>
  /**
   * A 4xx from the list endpoint, asserted by its code and handed back for the
   * caller to say more about. Takes a raw query string rather than
   * `QueryParams`, because most of what has to fail — bracket syntax, a
   * repeated `q`, a hand-edited cursor — is a shape `toQueryString` would never
   * build.
   */
  expectListError: (query: string, code: ErrorCode) => Promise<ApiErrorBody>
}

export const createTestServer = ({ seed, clientDir }: TestServerOptions = {}): TestServer => {
  let database: MigratedDatabase | undefined
  let app: Express | undefined
  let request: supertest.Agent | undefined

  beforeAll(() => {
    database = createMigratedDatabase()
    seed?.(database.db)
    app = createApp(database.db, { clientDir })
    request = supertest(app)
  })

  afterAll(() => {
    database?.close()
  })

  /* The handle is returned before `beforeAll` has run, so every field is a
     getter over a value that only exists inside a test. */
  const built = <T>(value: T | undefined, name: string): T => {
    if (value === undefined) {
      throw new Error(`${name} is built in beforeAll — read it inside a test, not at module scope`)
    }
    return value
  }

  /* The 200 path for a filtered endpoint, so a test body reads as params in,
     response out. Failures go through `expectListError`, or through `request`
     directly, where the status and the envelope are the point. */
  const ok = async <T>(path: string, params: QueryParams): Promise<T> => {
    const response = await built(request, 'request')
      .get(`${path}?${toQueryString(params)}`)
      .expect(200)
    return response.body as T
  }

  return {
    get app() {
      return built(app, 'app')
    },
    get db() {
      return built(database, 'the database').db
    },
    get request() {
      return built(request, 'request')
    },
    getHealth: async () => {
      const response = await built(request, 'request').get('/api/health').expect(200)
      return response.body as HealthResponse
    },
    listUsers: (params = {}) => ok<UserListResponse>('/api/users', params),
    getFacets: (params = {}) => ok<FacetsResponse>('/api/facets', params),
    expectListError: async (query, code) => {
      /* The status is looked up from the code rather than passed in, which is
         the same argument `ERROR_STATUS` itself makes: each code means exactly
         one status, and a caller free to pair them would eventually assert a
         `200 NOT_FOUND` and be satisfied. */
      const response = await built(request, 'request')
        .get(`/api/users?${query}`)
        .expect(ERROR_STATUS[code])
      const body = response.body as ApiErrorBody

      expect(body.error.code).toBe(code)
      return body
    },
  }
}

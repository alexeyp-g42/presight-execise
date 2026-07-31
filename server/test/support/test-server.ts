import supertest from 'supertest'
import { afterAll, beforeAll } from 'vitest'
import type { Express } from 'express'
import { createApp } from '../../src/app.ts'
import { migrate } from '../../src/db/migrate.ts'
import { openDb, type Db } from '../../src/db/open-db.ts'
import type { HealthResponse } from '../../src/routes/health.ts'
import { createTempDatabase, type TempDatabase } from './temp-database.ts'

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
}

export type TestServer = {
  readonly app: Express
  readonly db: Db
  readonly request: supertest.Agent
  /** Typed request helpers. Test bodies read as data in, data out. */
  getHealth: () => Promise<HealthResponse>
}

export const createTestServer = ({ seed }: TestServerOptions = {}): TestServer => {
  let temp: TempDatabase | undefined
  let db: Db | undefined
  let app: Express | undefined
  let request: supertest.Agent | undefined

  beforeAll(() => {
    temp = createTempDatabase()
    db = openDb(temp.path)
    migrate(db)
    seed?.(db)
    app = createApp(db)
    request = supertest(app)
  })

  afterAll(() => {
    db?.$client.close()
    temp?.remove()
  })

  /* The handle is returned before `beforeAll` has run, so every field is a
     getter over a value that only exists inside a test. */
  const built = <T>(value: T | undefined, name: string): T => {
    if (value === undefined) {
      throw new Error(`${name} is built in beforeAll — read it from inside a test, not at module scope`)
    }
    return value
  }

  return {
    get app() {
      return built(app, 'app')
    },
    get db() {
      return built(db, 'db')
    },
    get request() {
      return built(request, 'request')
    },
    getHealth: async () => {
      const response = await built(request, 'request').get('/api/health').expect(200)
      return response.body as HealthResponse
    },
  }
}

import express, { type Express } from 'express'
import type { Db } from './db/open-db.ts'
import { errorHandler, notFoundHandler } from './http/error-handler.ts'
import { healthHandler } from './routes/health.ts'

/* A factory over a database handle, not a module that opens one. That is what
   lets the suite point a whole app at a throwaway file (see
   `test/support/test-server.ts`), and it keeps every path that opens a database
   in `openDb`. The bootstrap that listens is `src/index.ts` — separate, so no
   test ever binds a port. */
export const createApp = (db: Db): Express => {
  const app = express()

  /* Version-fingerprints the framework for anyone scanning. Nothing needs it. */
  app.disable('x-powered-by')

  /* Express's application-wide slot for shared handles: the app owns the
     database it was built with. Route modules take `db` as an argument rather
     than reaching for it — this is the one place to find the handle from an
     app, and `test/app.test.ts` holds the factory to that. */
  app.locals.db = db

  app.get('/api/health', healthHandler)

  /* Both stay last, and in this order: `notFoundHandler` turns "matched
     nothing" into an `ApiError`, and `errorHandler` is the single place any
     failure becomes a response body. */
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

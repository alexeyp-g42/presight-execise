import express, { type Express } from 'express'
import type { Db } from './db/open-db.ts'
import { errorHandler, notFoundHandler } from './http/error-handler.ts'
import { avatarHandler } from './routes/avatar.ts'
import { healthHandler } from './routes/health.ts'
import { createListUsersHandler } from './routes/users.ts'

/* A factory over a database handle, not a module that opens one. That is what
   lets the suite point a whole app at a throwaway file (see
   `test/support/test-server.ts`), and it keeps every path that opens a database
   in `openDb`. The bootstrap that listens is `src/index.ts` — separate, so no
   test ever binds a port. */
export const createApp = (db: Db): Express => {
  const app = express()

  /* Express's application-wide slot for shared handles: the app owns the
     database it was built with. Nothing reads it — the route factories below
     are handed `db` as an argument rather than reaching for it, so each one
     declares its dependency in its own signature — but it is where an app's
     handle is conventionally found, and `test/app.test.ts` asserts the app
     carries the one it was built with. */
  app.locals.db = db

  /* Express 5's own default, set explicitly because it is contract rather than
     preference: `simple` is `querystring.parse`, which decodes a repeated key
     into an array and leaves `hobbies[]` unparsed — and repeated keys are how
     multi-value selections travel, because display names contain commas. A
     future default of `extended` would silently start accepting bracket syntax
     and change what a duplicate key means. */
  app.set('query parser', 'simple')

  app.get('/api/health', healthHandler)
  app.get('/api/users', createListUsersHandler(db))
  /* The `.svg` is part of the path, not a format negotiation: the list endpoint
     mints `/api/avatars/<id>.svg` as a plain URL for an `<img>` tag, and an
     extension is what makes it read as one. */
  app.get('/api/avatars/:id.svg', avatarHandler)

  /* Both stay last, and in this order: `notFoundHandler` turns "matched
     nothing" into an `ApiError`, and `errorHandler` is the single place any
     failure becomes a response body. */
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

import express, { type Express } from 'express'
import { avatarHandler } from './feature/avatar/api/avatar-handler.ts'
import { healthHandler } from './feature/health/api/health-handler.ts'
import { createFacetsHandler } from './feature/user/api/facets-handler.ts'
import { createListUsersHandler } from './feature/user/api/list-users-handler.ts'
import type { Db } from './shared/db/open-db.ts'
import { errorHandler, notFoundHandler } from './shared/http/error-handler.ts'
import { CLIENT_DIR, serveClient } from './shared/http/serve-client.ts'

export type AppOptions = {
  /** The built client to serve. Absent on disk means API-only, which is the dev loop. */
  clientDir?: string
}

/* A factory over a database handle, not a module that opens one. That is what
   lets the suite point a whole app at a throwaway file (see
   `test/support/test-server.ts`), and it keeps every path that opens a database
   in `openDb`. The bootstrap that listens is `src/index.ts` — separate, so no
   test ever binds a port. `clientDir` is the same seam one layer out: a
   throwaway build directory, so the static half is exercised without one.

   It is also the composition root: the one file that imports all three features
   — `user`, `avatar`, `health` — and the only one the boundary rules leave
   unconstrained, because mounting every feature's routes in an order this file's
   own comments call contract is the whole of what it is for. Route-to-handler
   stays visible here rather than behind a router per feature, so the order can
   be read in one pass. */
export const createApp = (db: Db, { clientDir = CLIENT_DIR }: AppOptions = {}): Express => {
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
  app.get('/api/facets', createFacetsHandler(db))
  /* The `.svg` is part of the path, not a format negotiation: the list endpoint
     mints `/api/avatars/<id>.svg` as a plain URL for an `<img>` tag, and an
     extension is what makes it read as one. */
  app.get('/api/avatars/:id.svg', avatarHandler)

  /* Anything still under `/api` here matched no route above, and the answer is
     the error envelope. It sits in front of the client rather than as a path
     check inside it, so the SPA shell can never be handed back where JSON was
     asked for — placement is the guarantee, not a string comparison. */
  app.use('/api', notFoundHandler)

  /* The built client, from the same origin. A no-op when there is no build on
     disk, which is every environment but the image. */
  app.use(serveClient(clientDir))

  /* Both stay last, and in this order: `notFoundHandler` turns "matched
     nothing" into an `ApiError`, and `errorHandler` is the single place any
     failure becomes a response body. */
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

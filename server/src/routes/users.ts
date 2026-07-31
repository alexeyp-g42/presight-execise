import type { RequestHandler } from 'express'
import type { Db } from '../db/open-db.ts'
import { listUsers } from '../users/list-users.ts'
import { parseUserFilterParams } from '../users/user-filter-params.ts'

/* A factory over the handle, matching the app factory above it: the route is
   handed its database rather than reaching into `app.locals` for one, so the
   dependency is visible in the signature and a test can point it anywhere.
 *
 * Validate, query, respond — and nothing else. A `ZodError` from the first step
 * needs no try/catch here: Express 5 forwards a throw from a handler to the
 * error middleware, which is the single place a failure becomes a body. */
export const createListUsersHandler =
  (db: Db): RequestHandler =>
  (req, res) => {
    res.json(listUsers(db, parseUserFilterParams(req.query)))
  }

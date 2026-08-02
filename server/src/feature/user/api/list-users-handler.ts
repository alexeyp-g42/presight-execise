import type { RequestHandler } from 'express'
import type { Db } from '../../../shared/db/open-db.ts'
import { listUsers } from '../lib/list-users.ts'
import { parseListUsersParams } from '../schemas/list-users-params.ts'

/* A factory over the handle, matching the app factory above it: the route is
   handed its database rather than reaching into `app.locals` for one, so the
   dependency is visible in the signature and a test can point it anywhere.
 *
 * Validate, query, respond — and nothing else. Neither a `ZodError` from the
 * first step nor the `ApiError` a bad cursor raises inside the second needs a
 * try/catch here: Express 5 forwards a throw from a handler to the error
 * middleware, which is the single place a failure becomes a body. */
export const createListUsersHandler =
  (db: Db): RequestHandler =>
  (req, res) => {
    res.json(listUsers(db, parseListUsersParams(req.query)))
  }

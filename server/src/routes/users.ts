import { Router } from 'express'
import type { Db } from '../db/connection.js'
import { parsePageRequest } from '../query/filters.js'
import { queryUsers } from '../query/users.js'

export function usersRouter(db: Db): Router {
  const router = Router()

  router.get('/', (req, res) => {
    res.json(queryUsers(db, parsePageRequest(req.query)))
  })

  return router
}

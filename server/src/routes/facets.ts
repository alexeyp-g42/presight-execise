import { Router } from 'express'
import type { Db } from '../db/connection.js'
import { queryFacets } from '../query/facets.js'
import { parseFilterState } from '../query/filters.js'

export function facetsRouter(db: Db): Router {
  const router = Router()

  router.get('/', (req, res) => {
    res.json(queryFacets(db, parseFilterState(req.query)))
  })

  return router
}

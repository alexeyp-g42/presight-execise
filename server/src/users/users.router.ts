import { Router } from 'express';
import type { Db } from '../db/connection.js';
import { parseFacetsQuery, parseUsersQuery } from '../common/params.js';
import { fetchUsersPage } from './users.query.js';
import { fetchFacets } from './facets.query.js';

/**
 * The handlers are one-liners because every decision already lives in a tested
 * unit. Express 5 forwards anything thrown from a synchronous handler to the
 * error middleware, so validation failures surface as their ApiError status.
 */
export function createUsersRouter(db: Db): Router {
  const router = Router();

  router.get('/users', (req, res) => {
    res.json(fetchUsersPage(db, parseUsersQuery(req.query)));
  });

  router.get('/facets', (req, res) => {
    res.json(fetchFacets(db, parseFacetsQuery(req.query)));
  });

  return router;
}

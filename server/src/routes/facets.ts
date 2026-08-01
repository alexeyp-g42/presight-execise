import type { RequestHandler } from 'express'
import type { Db } from '../db/open-db.ts'
import { countFacets } from '../users/count-facets.ts'
import { parseUserFilterParams } from '../users/user-filter-params.ts'

/* A second endpoint rather than a second field on the list response, split on
   cache key: facets are page- **and** sort-independent, so bundling them would
   re-run two aggregates and re-ship 40+ entries on every infinite-scroll fetch,
   and would make the response shape imply that facets vary by page.
 *
 * The split is enforced here rather than left to the client's discipline: this
 * handler parses the *filter* params, which are strict, so a stray `sort`,
 * `dir`, `limit` or `cursor` is a loud 400 naming the offending key rather than
 * a parameter silently ignored. The client composes its two param builders in
 * the same direction — list params are filter params plus the four. */
export const createFacetsHandler =
  (db: Db): RequestHandler =>
  (req, res) => {
    res.json(countFacets(db, parseUserFilterParams(req.query)))
  }

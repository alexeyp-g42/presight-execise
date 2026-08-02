import type { RequestHandler } from 'express'
import type { Db } from '../../../shared/db/open-db.ts'
import { countFacets } from '../lib/count-facets.ts'
import { parseUserFilterParams } from '../schemas/user-filter-params.ts'

/* A second endpoint rather than a second field on the list response, split on
   cache key: facets are page- **and** sort-independent, so bundling them would
   re-run two aggregates and re-ship 40+ entries on every infinite-scroll fetch.
 *
 * The split is enforced here rather than left to the caller's discipline. This
 * parses the *filter* params — the list's minus `sort`, `dir`, `limit` and
 * `cursor` — and they are strict, so any of those four arriving is a loud 400
 * naming the offending key rather than a parameter silently ignored. */
export const createFacetsHandler =
  (db: Db): RequestHandler =>
  (req, res) => {
    res.json(countFacets(db, parseUserFilterParams(req.query)))
  }

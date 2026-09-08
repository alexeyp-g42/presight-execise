import type { Db } from '../db/connection.js'
import type { FilterState } from './filters.js'
import { buildFilterPredicate } from './sql.js'

export interface FacetValue {
  value: string
  count: number
}

export interface Facets {
  total: number
  hobbies: FacetValue[]
  nationalities: FacetValue[]
}

const FACET_LIMIT = 20

export function queryFacets(db: Db, state: FilterState): Facets {
  const predicate = buildFilterPredicate(state)
  const filtered = `WITH filtered AS (
    SELECT u.id AS id, u.nationality AS nationality FROM users u WHERE ${predicate.sql}
  )`

  const total = db
    .prepare(`${filtered} SELECT COUNT(*) AS total FROM filtered`)
    .get(predicate.params) as { total: number }

  const nationalities = db
    .prepare(
      `${filtered}
       SELECT nationality AS value, COUNT(*) AS count
       FROM filtered
       GROUP BY nationality
       ORDER BY count DESC, value ASC
       LIMIT ${FACET_LIMIT}`,
    )
    .all(predicate.params) as FacetValue[]

  const hobbies = db
    .prepare(
      `${filtered}
       SELECT h.name AS value, COUNT(*) AS count
       FROM filtered f
       JOIN user_hobbies uh ON uh.user_id = f.id
       JOIN hobbies h ON h.id = uh.hobby_id
       GROUP BY h.id
       ORDER BY count DESC, value ASC
       LIMIT ${FACET_LIMIT}`,
    )
    .all(predicate.params) as FacetValue[]

  return { total: total.total, hobbies, nationalities }
}

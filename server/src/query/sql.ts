import type { FilterState } from './filters.js'

export interface Predicate {
  sql: string
  params: Record<string, string | number>
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`)
}

export function buildFilterPredicate(state: FilterState): Predicate {
  const clauses: string[] = []
  const params: Record<string, string | number> = {}

  if (state.q.length > 0) {
    params.q = `${escapeLike(state.q)}%`
    clauses.push(
      "(u.first_name LIKE :q ESCAPE '\\' OR u.last_name LIKE :q ESCAPE '\\')",
    )
  }

  if (state.nationalities.length > 0) {
    const names = state.nationalities.map((value, index) => {
      params[`nat${index}`] = value
      return `:nat${index}`
    })
    clauses.push(`u.nationality IN (${names.join(', ')})`)
  }

  if (state.hobbies.length > 0) {
    const names = state.hobbies.map((value, index) => {
      params[`hob${index}`] = value
      return `:hob${index}`
    })
    params.hobbyCount = state.hobbies.length
    clauses.push(
      `u.id IN (
        SELECT uh.user_id FROM user_hobbies uh
        JOIN hobbies h ON h.id = uh.hobby_id
        WHERE h.name IN (${names.join(', ')})
        GROUP BY uh.user_id
        HAVING COUNT(*) = :hobbyCount
      )`,
    )
  }

  return { sql: clauses.length > 0 ? clauses.join(' AND ') : '1 = 1', params }
}

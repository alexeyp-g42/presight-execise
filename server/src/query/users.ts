import type { Db } from '../db/connection.js'
import { encodeCursor, type PageRequest } from './filters.js'
import { buildFilterPredicate } from './sql.js'

export interface UserRecord {
  id: number
  avatar: string
  first_name: string
  last_name: string
  age: number
  nationality: string
  hobbies: string[]
}

export interface UserPage {
  items: UserRecord[]
  pageInfo: { nextCursor: string | null; hasMore: boolean }
}

type UserRow = Omit<UserRecord, 'hobbies'>

export function queryUsers(db: Db, request: PageRequest): UserPage {
  const predicate = buildFilterPredicate(request)
  const direction = request.order === 'asc' ? 'ASC' : 'DESC'
  const comparison = request.order === 'asc' ? '>' : '<'
  const params: Record<string, string | number> = { ...predicate.params, take: request.limit + 1 }

  let keyset = ''
  if (request.cursor !== null) {
    params.cursorValue = request.cursor.v
    params.cursorId = request.cursor.id
    keyset = `AND (u.${request.sort}, u.id) ${comparison} (:cursorValue, :cursorId)`
  }

  const rows = db
    .prepare(
      `SELECT u.id, u.avatar, u.first_name, u.last_name, u.age, u.nationality
       FROM users u
       WHERE ${predicate.sql} ${keyset}
       ORDER BY u.${request.sort} ${direction}, u.id ${direction}
       LIMIT :take`,
    )
    .all(params) as UserRow[]

  const hasMore = rows.length > request.limit
  const page = hasMore ? rows.slice(0, request.limit) : rows
  const last = page.at(-1)

  return {
    items: attachHobbies(db, page),
    pageInfo: {
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last[request.sort], last.id) : null,
    },
  }
}

function attachHobbies(db: Db, rows: UserRow[]): UserRecord[] {
  if (rows.length === 0) {
    return []
  }

  const placeholders = rows.map(() => '?').join(', ')
  const pairs = db
    .prepare(
      `SELECT uh.user_id AS userId, h.name AS name
       FROM user_hobbies uh
       JOIN hobbies h ON h.id = uh.hobby_id
       WHERE uh.user_id IN (${placeholders})
       ORDER BY h.name`,
    )
    .all(...rows.map((row) => row.id)) as Array<{ userId: number; name: string }>

  const byUser = new Map<number, string[]>()
  for (const pair of pairs) {
    const existing = byUser.get(pair.userId)
    if (existing) {
      existing.push(pair.name)
    } else {
      byUser.set(pair.userId, [pair.name])
    }
  }

  return rows.map((row) => ({ ...row, hobbies: byUser.get(row.id) ?? [] }))
}

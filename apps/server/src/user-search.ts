import type { SQLInputValue } from 'node:sqlite'
import { z } from 'zod'
import {
    type FacetValue,
    facetValueSchema,
    type Hobby,
    hobbySchema,
    TOP_FACET_LIMIT,
    type UserSearchItem,
    userSearchItemSchema,
    type UserSearchQuery,
    type UserSearchResult,
    type UserSortField,
} from '@presight/schema'
import { db } from './db.ts'

/** `ORDER BY` targets, keyed by the sort field the client may ask for. Never interpolate user input. */
const SORT_COLUMNS: Record<UserSortField, string> = {
    first_name: 'u.first_name COLLATE NOCASE',
    last_name: 'u.last_name COLLATE NOCASE',
    age: 'u.age',
    nationality: 'n.label COLLATE NOCASE',
}

const totalRowSchema = z.object({ total: z.number().int().min(0) })

/** `?` placeholder list for an `IN (...)` clause. */
function placeholders(count: number): string {
    return Array.from({ length: count }, () => '?').join(', ')
}

/** Escapes LIKE wildcards so a literal `%` or `_` in user input cannot widen the match. */
function prefixPattern(value: string): string {
    return `${value.replace(/[\\%_]/g, '\\$&')}%`
}

type WhereClause = { sql: string; params: SQLInputValue[] }

/**
 * Builds the predicate shared by the page, the total count and both facet queries, so every part
 * of the response describes the exact same set of users.
 */
function buildWhere(query: UserSearchQuery): WhereClause {
    const conditions: string[] = []
    const params: SQLInputValue[] = []

    // Text filter: each supplied name matches as a prefix, and the two are OR-ed together so typing
    // in a single search box can hit either column.
    const textConditions: string[] = []
    if (query.first_name !== undefined) {
        textConditions.push("u.first_name LIKE ? ESCAPE '\\'")
        params.push(prefixPattern(query.first_name))
    }
    if (query.last_name !== undefined) {
        textConditions.push("u.last_name LIKE ? ESCAPE '\\'")
        params.push(prefixPattern(query.last_name))
    }
    if (textConditions.length > 0) {
        conditions.push(`(${textConditions.join(' OR ')})`)
    }

    // Nationalities are OR-ed: a user from any of the selected countries matches.
    if (query.nationality_code.length > 0) {
        conditions.push(`u.nationality_code IN (${placeholders(query.nationality_code.length)})`)
        params.push(...query.nationality_code)
    }

    // Hobbies are AND-ed: the user must hold every selected hobby. Kept as a subquery rather than a
    // join so it neither multiplies user rows nor drops the users that have no hobbies at all.
    if (query.hobby_id.length > 0) {
        conditions.push(`u.id IN (
            SELECT uh.user_id
            FROM user_hobbies uh
            WHERE uh.hobby_id IN (${placeholders(query.hobby_id.length)})
            GROUP BY uh.user_id
            HAVING COUNT(DISTINCT uh.hobby_id) = ?
        )`)
        params.push(...query.hobby_id, query.hobby_id.length)
    }

    return {
        sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params,
    }
}

const userRowSchema = userSearchItemSchema.omit({ hobbies: true })
const hobbyRowSchema = hobbySchema.extend({ user_id: z.string().min(1) })

/**
 * Hobbies of the users on the current page, in one round trip rather than one query per row.
 * Users with no hobbies simply get no entry, so callers must fall back to an empty list.
 */
function hobbiesByUser(userIds: string[]): Map<string, Hobby[]> {
    const byUser = new Map<string, Hobby[]>()
    if (userIds.length === 0) return byUser

    const rows = db
        .prepare(`
            SELECT uh.user_id AS user_id, h.id AS id, h.label AS label
            FROM user_hobbies uh
            JOIN hobbies h ON h.id = uh.hobby_id
            WHERE uh.user_id IN (${placeholders(userIds.length)})
            ORDER BY h.label
        `)
        .all(...userIds)

    for (const { user_id, ...hobby } of z.array(hobbyRowSchema).parse(rows)) {
        const existing = byUser.get(user_id)
        if (existing) existing.push(hobby)
        else byUser.set(user_id, [hobby])
    }

    return byUser
}

function selectPage(query: UserSearchQuery, where: WhereClause): UserSearchItem[] {
    const direction = query.sort === 'desc' ? 'DESC' : 'ASC'
    // `u.id` breaks ties so the ordering is total: no user is repeated or skipped across pages.
    const orderBy = `${SORT_COLUMNS[query.orderby]} ${direction}, u.id ASC`

    const rows = db
        .prepare(`
            SELECT u.id, u.avatar, u.first_name, u.last_name, u.age, u.nationality_code, n.label AS nationality_label
            FROM users u
            JOIN nationalities n ON n.code = u.nationality_code
            ${where.sql}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `)
        .all(...where.params, query.pagesize, query.offset)

    const page = z.array(userRowSchema).parse(rows)
    const hobbies = hobbiesByUser(page.map((user) => user.id))

    const users: UserSearchItem[] = []
    for (const user of page) {
        users.push({ ...user, hobbies: hobbies.get(user.id) ?? [] })
    }

    return users
}

function countMatches(where: WhereClause): number {
    const row = db.prepare(`SELECT COUNT(*) AS total FROM users u ${where.sql}`).get(...where.params)
    return totalRowSchema.parse(row).total
}

/** Top hobbies held by the matching users. Ordered by count, then label so ties stay stable. */
function topHobbies(where: WhereClause): FacetValue[] {
    const rows = db
        .prepare(`
            SELECT h.id AS value, h.label AS label, COUNT(*) AS count
            FROM user_hobbies uh
            JOIN hobbies h ON h.id = uh.hobby_id
            WHERE uh.user_id IN (SELECT u.id FROM users u ${where.sql})
            GROUP BY h.id
            ORDER BY count DESC, h.label ASC
            LIMIT ${TOP_FACET_LIMIT}
        `)
        .all(...where.params)

    return z.array(facetValueSchema).parse(rows)
}

/** Top nationalities among the matching users, using the same ordering rules as the hobby facet. */
function topNationalities(where: WhereClause): FacetValue[] {
    const rows = db
        .prepare(`
            SELECT n.code AS value, n.label AS label, COUNT(*) AS count
            FROM users u
            JOIN nationalities n ON n.code = u.nationality_code
            ${where.sql}
            GROUP BY n.code
            ORDER BY count DESC, n.label ASC
            LIMIT ${TOP_FACET_LIMIT}
        `)
        .all(...where.params)

    return z.array(facetValueSchema).parse(rows)
}

export function searchUsers(query: UserSearchQuery): UserSearchResult {
    const where = buildWhere(query)

    const users = selectPage(query, where)
    const total = countMatches(where)

    return {
        users,
        pagination: {
            offset: query.offset,
            pagesize: query.pagesize,
            total,
            has_more: query.offset + users.length < total,
        },
        top_hobbies: topHobbies(where),
        top_nationalities: topNationalities(where),
    }
}

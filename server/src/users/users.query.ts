import type { Db } from '../db/connection.js';
import type { UsersQuery } from '../common/params.js';
import type { ApiUser, UsersResponse } from '../shared/contract.js';
import { buildMatchedCte, type SqlParams } from './filters.js';
import { decodeCursor, encodeCursor, queryFingerprint } from './cursor.js';

interface UserRow {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
}

export function fetchUsersPage(db: Db, query: UsersQuery): UsersResponse {
  const { sql: cte, params: cteParams } = buildMatchedCte(query);

  // Safe to interpolate: zod has already constrained `sort` to one of the four
  // literal SORT_FIELDS. Everything derived from user input is bound.
  const column = query.sort;
  const direction = query.order === 'desc' ? 'DESC' : 'ASC';
  const comparison = query.order === 'desc' ? '<' : '>';

  const fingerprint = queryFingerprint(query);
  const pageParams: SqlParams = { ...cteParams, limit: query.limit + 1 };
  let cursorClause = '';

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor, fingerprint);
    pageParams.cv = cursor.v;
    pageParams.ci = cursor.i;
    // Mirrors the ORDER BY exactly. `id` is always ascending, in both
    // directions, so it is a stable final tie-breaker.
    cursorClause = `WHERE (m.${column} ${comparison} :cv) OR (m.${column} = :cv AND m.id > :ci)`;
  }

  const rows = db
    .prepare(
      `WITH ${cte}
       SELECT m.id, m.avatar, m.first_name, m.last_name, m.age, m.nationality
       FROM matched m
       ${cursorClause}
       ORDER BY m.${column} ${direction}, m.id ASC
       LIMIT :limit`,
    )
    .all(pageParams) as unknown as UserRow[];

  // One extra row was requested; whether it came back *is* `has_more`. That
  // stays correct on the final page and does not depend on `total`.
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  const { total } = db
    .prepare(`WITH ${cte} SELECT COUNT(*) AS total FROM matched`)
    .get(cteParams) as unknown as { total: number };

  const last = page.at(-1);

  return {
    data: attachHobbies(db, page),
    page_info: {
      total,
      returned: page.length,
      has_more: hasMore,
      next_cursor: hasMore && last ? encodeCursor({ v: last[column], i: last.id }, fingerprint) : null,
    },
  };
}

/**
 * Fetched separately rather than with group_concat, which would corrupt any
 * hobby name containing the delimiter. Names come back alphabetically so a
 * card's "first two hobbies" is stable between requests.
 */
function attachHobbies(db: Db, rows: UserRow[]): ApiUser[] {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const links = db
    .prepare(
      `SELECT uh.user_id AS user_id, h.name AS name
       FROM user_hobbies uh
       JOIN hobbies h ON h.id = uh.hobby_id
       WHERE uh.user_id IN (${ids.map(() => '?').join(', ')})
       ORDER BY h.name COLLATE NOCASE`,
    )
    .all(...ids) as unknown as { user_id: number; name: string }[];

  const byUser = new Map<number, string[]>();
  for (const link of links) {
    const existing = byUser.get(link.user_id);
    if (existing) existing.push(link.name);
    else byUser.set(link.user_id, [link.name]);
  }

  return rows.map((row) => ({ ...row, hobbies: byUser.get(row.id) ?? [] }));
}

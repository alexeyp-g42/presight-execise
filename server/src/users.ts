import type { Db } from "./db.js";

export const SORT_FIELDS = ["first_name", "last_name", "age", "nationality"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

export interface UserFilters {
  search: string;
  nationalities: string[];
  hobbies: string[];
}

export interface UserQuery extends UserFilters {
  sort: SortField;
  order: SortOrder;
  limit: number;
  cursor: Cursor | null;
}

export type Cursor = [value: string | number, id: number];

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  nationalities: string[];
  hobbies: string[];
}

export interface UserPage {
  data: User[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  hobbies: FacetValue[];
  nationalities: FacetValue[];
}

interface Condition {
  sql: string;
  params: unknown[];
}

const FACET_LIMIT = 20;

export const encodeCursor = (cursor: Cursor): string => {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
};

export const decodeCursor = (raw: string): Cursor | null => {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      (typeof parsed[0] === "string" || typeof parsed[0] === "number") &&
      Number.isInteger(parsed[1])
    ) {
      return parsed as Cursor;
    }
  } catch {
    return null;
  }
  return null;
};

const escapeLike = (value: string) => {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
};

const placeholders = (values: unknown[]) => {
  return values.map(() => "?").join(", ");
};

const filterConditions = (filters: UserFilters): Condition[] => {
  const conditions: Condition[] = [];

  for (const term of filters.search.trim().split(/\s+/).filter(Boolean)) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push({
      sql: "(u.first_name LIKE ? ESCAPE '\\' OR u.last_name LIKE ? ESCAPE '\\')",
      params: [pattern, pattern],
    });
  }

  if (filters.nationalities.length > 0) {
    conditions.push({
      sql: `u.id IN (
        SELECT un.user_id
        FROM user_nationalities un
        WHERE un.nationality IN (${placeholders(filters.nationalities)})
      )`,
      params: filters.nationalities,
    });
  }

  if (filters.hobbies.length > 0) {
    conditions.push({
      sql: `u.id IN (
        SELECT uh.user_id
        FROM user_hobbies uh
        JOIN hobbies h ON h.id = uh.hobby_id
        WHERE h.name IN (${placeholders(filters.hobbies)})
        GROUP BY uh.user_id
        HAVING COUNT(*) = ?
      )`,
      params: [...filters.hobbies, filters.hobbies.length],
    });
  }

  return conditions;
};

const whereClause = (conditions: Condition[]) => {
  return {
    sql: conditions.length ? `WHERE ${conditions.map((c) => c.sql).join(" AND ")}` : "",
    params: conditions.flatMap((c) => c.params),
  };
};

const cursorCondition = (sort: SortField, order: SortOrder, cursor: Cursor): Condition => {
  const op = order === "asc" ? ">" : "<";
  return {
    sql: `(u.${sort} ${op} ? OR (u.${sort} = ? AND u.id ${op} ?))`,
    params: [cursor[0], cursor[0], cursor[1]],
  };
};

export const listUsers = (db: Db, query: UserQuery): UserPage => {
  const conditions = filterConditions(query);
  const filtered = whereClause(conditions);

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM users u ${filtered.sql}`)
    .get(...filtered.params) as { total: number };

  const page = whereClause(
    query.cursor ? [...conditions, cursorCondition(query.sort, query.order, query.cursor)] : conditions,
  );
  const direction = query.order === "asc" ? "ASC" : "DESC";

  const rows = db
    .prepare(
      `SELECT
        u.id, u.avatar, u.first_name, u.last_name, u.age, u.nationality,
        (
          SELECT json_group_array(nationality) FROM (
            SELECT un.nationality
            FROM user_nationalities un
            WHERE un.user_id = u.id
            ORDER BY un.is_primary DESC, un.nationality
          )
        ) AS nationalities,
        (
          SELECT json_group_array(name) FROM (
            SELECT h.name
            FROM user_hobbies uh
            JOIN hobbies h ON h.id = uh.hobby_id
            WHERE uh.user_id = u.id
            ORDER BY h.name
          )
        ) AS hobbies
      FROM users u
      ${page.sql}
      ORDER BY u.${query.sort} ${direction}, u.id ${direction}
      LIMIT ?`,
    )
    .all(...page.params, query.limit + 1) as (Omit<User, "hobbies" | "nationalities"> & {
    nationalities: string;
    hobbies: string;
  })[];

  const hasMore = rows.length > query.limit;
  const data: User[] = rows.slice(0, query.limit).map((row) => ({
    ...row,
    nationalities: JSON.parse(row.nationalities),
    hobbies: JSON.parse(row.hobbies),
  }));
  const last = data.at(-1);

  return {
    data,
    total,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor([last[query.sort], last.id]) : null,
  };
};

export const getFacets = (db: Db, filters: UserFilters): Facets => {
  const where = whereClause(filterConditions(filters));

  const hobbies = db
    .prepare(
      `SELECT h.name AS value, COUNT(*) AS count
      FROM users u
      JOIN user_hobbies uh ON uh.user_id = u.id
      JOIN hobbies h ON h.id = uh.hobby_id
      ${where.sql}
      GROUP BY h.id
      ORDER BY count DESC, value ASC
      LIMIT ?`,
    )
    .all(...where.params, FACET_LIMIT) as FacetValue[];

  const nationalities = db
    .prepare(
      `SELECT un.nationality AS value, COUNT(*) AS count
      FROM users u
      JOIN user_nationalities un ON un.user_id = u.id
      ${where.sql}
      GROUP BY un.nationality
      ORDER BY count DESC, value ASC
      LIMIT ?`,
    )
    .all(...where.params, FACET_LIMIT) as FacetValue[];

  return { hobbies, nationalities };
};

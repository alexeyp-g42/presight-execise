import type { FacetsQuery } from '../common/params.js';

export type SqlParams = Record<string, string | number>;

/** Escapes LIKE metacharacters so a search for `50%` is a literal search. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Builds the shared `matched` CTE body.
 *
 * Every output — the page, the total, and both facet lists — derives from this
 * one definition. That is what makes "facet counts reflect the active filters"
 * true by construction rather than by remembering to keep two queries in sync.
 *
 * Returns the CTE body only; callers prefix it with `WITH `.
 */
export function buildMatchedCte(filters: FacetsQuery): { sql: string; params: SqlParams } {
  const conditions: string[] = [];
  const params: SqlParams = {};

  // Tokenised: every whitespace-separated token must match the first or last
  // name. A single LIKE across both columns would return nothing for "john
  // smith" and look broken.
  const tokens = filters.q.trim().split(/\s+/).filter(Boolean);
  tokens.forEach((token, index) => {
    params[`t${index}`] = `%${escapeLike(token)}%`;
    conditions.push(
      `(u.first_name LIKE :t${index} ESCAPE '\\' OR u.last_name LIKE :t${index} ESCAPE '\\')`,
    );
  });

  if (filters.nationalities.length > 0) {
    const placeholders = filters.nationalities.map((value, index) => {
      params[`n${index}`] = value;
      return `:n${index}`;
    });
    conditions.push(`u.nationality IN (${placeholders.join(', ')})`);
  }

  if (filters.hobbies.length > 0) {
    const placeholders = filters.hobbies.map((value, index) => {
      params[`h${index}`] = value;
      return `:h${index}`;
    });
    // The *requested* count, not the number of hobbies that resolved. Asking
    // for a hobby that does not exist must match nobody; counting resolved ids
    // would quietly drop the missing filter instead.
    params.hobbyCount = filters.hobbies.length;
    conditions.push(`u.id IN (
      SELECT uh.user_id FROM user_hobbies uh
      WHERE uh.hobby_id IN (SELECT id FROM hobbies WHERE name IN (${placeholders.join(', ')}))
      GROUP BY uh.user_id
      HAVING COUNT(DISTINCT uh.hobby_id) = :hobbyCount
    )`);
  }

  const sql = `matched AS (
    SELECT u.id, u.avatar, u.first_name, u.last_name, u.age, u.nationality
    FROM users u
    ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
  )`;

  return { sql, params };
}

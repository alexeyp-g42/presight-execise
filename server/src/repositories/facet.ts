import type { Database } from '../db/connection.js';
import { buildFilter, type FilterParams } from '../queries/filter.js';
import type { FacetEntry } from '@shared/types.js';

export class FacetRepository {
  constructor(private readonly db: Database) {}

  topHobbies(filter: FilterParams, limit = 20): FacetEntry[] {
    const matchedUsers = this.matchedUserIdsSql(filter);
    const sql = `
      SELECT h.name AS value, COUNT(*) AS count
      FROM user_hobbies uh
      JOIN hobbies h ON h.id = uh.hobby_id
      WHERE uh.user_id IN (${matchedUsers.sql})
      GROUP BY h.name
      ORDER BY count DESC, h.name ASC
      LIMIT ?
    `;
    return this.db.prepare(sql).all(...matchedUsers.params, limit) as FacetEntry[];
  }

  topNationalities(filter: FilterParams, limit = 20): FacetEntry[] {
    const matchedUsers = this.matchedUserIdsSql(filter);
    const sql = `
      SELECT u.nationality AS value, COUNT(*) AS count
      FROM users u
      WHERE u.id IN (${matchedUsers.sql})
      GROUP BY u.nationality
      ORDER BY count DESC, u.nationality ASC
      LIMIT ?
    `;
    return this.db.prepare(sql).all(...matchedUsers.params, limit) as FacetEntry[];
  }

  private matchedUserIdsSql(filter: FilterParams): { sql: string; params: unknown[] } {
    const f = buildFilter(filter);
    const groupBy = f.hobbyCount > 0 ? 'GROUP BY u.id' : '';
    const sql = `
      SELECT u.id
      FROM users u
      ${f.joinSql}
      ${f.whereSql}
      ${groupBy}
      ${f.havingSql}
    `;
    return { sql, params: f.params };
  }
}

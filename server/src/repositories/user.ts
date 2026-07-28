import type { Database } from '../db/connection.js';
import { buildFilter, type FilterParams } from '../queries/filter.js';
import type { CursorPayload } from '../queries/cursor.js';
import type { SortField, SortDir } from '@shared/types.js';

export interface UserRow {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string; // comma-joined, empty string if none
}

export interface ListArgs {
  filter: FilterParams;
  sort: SortField | 'id';
  dir: SortDir;
  cursor: CursorPayload | null;
  limit: number;
}

const SORT_COLUMN: Record<SortField | 'id', string> = {
  first_name: 'u.first_name',
  last_name: 'u.last_name',
  age: 'u.age',
  nationality: 'u.nationality',
  id: 'u.id',
};

export class UserRepository {
  constructor(private readonly db: Database) {}

  listPage(args: ListArgs): UserRow[] {
    const f = buildFilter(args.filter);
    const sortCol = SORT_COLUMN[args.sort];
    const dir = args.dir === 'desc' ? 'DESC' : 'ASC';
    const cmp = args.dir === 'desc' ? '<' : '>';

    const params: unknown[] = [...f.params];
    const cursorWhere: string[] = [];
    if (args.cursor) {
      // (sort_value, id) > (?, ?) — expressed as OR for portability
      if (args.sort === 'id') {
        cursorWhere.push(`u.id ${cmp} ?`);
        params.push(args.cursor.id);
      } else {
        cursorWhere.push(
          `(${sortCol} ${cmp} ? OR (${sortCol} = ? AND u.id ${cmp} ?))`
        );
        params.push(args.cursor.v, args.cursor.v, args.cursor.id);
      }
    }

    const whereParts: string[] = [];
    if (f.whereSql) whereParts.push(f.whereSql.replace(/^WHERE /, ''));
    if (cursorWhere.length) whereParts.push(cursorWhere.join(' AND '));
    const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const groupBy = f.hobbyCount > 0 ? 'GROUP BY u.id' : '';
    const having = f.havingSql;

    const sql = `
      SELECT
        u.id, u.avatar, u.first_name, u.last_name, u.age, u.nationality,
        COALESCE(
          (SELECT GROUP_CONCAT(h2.name, ',')
             FROM user_hobbies uh2 JOIN hobbies h2 ON h2.id = uh2.hobby_id
            WHERE uh2.user_id = u.id
            ORDER BY h2.name),
          ''
        ) AS hobbies
      FROM users u
      ${f.joinSql}
      ${where}
      ${groupBy}
      ${having}
      ORDER BY ${sortCol} ${dir}, u.id ${dir}
      LIMIT ?
    `;
    params.push(args.limit);

    return this.db.prepare(sql).all(...params) as UserRow[];
  }
}

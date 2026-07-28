import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserRepository, type UserRow } from '../../src/repositories/user.js';
import { openDatabase, type Database } from '../../src/db/connection.js';
import type { SortField, SortDir } from '@shared/types.js';

function insertUser(db: Database, first: string, last: string, age: number, nat: string): number {
  const r = db
    .prepare(
      `INSERT INTO users (avatar, first_name, last_name, age, nationality, full_name_lc)
       VALUES ('', ?, ?, ?, ?, ?)`
    )
    .run(first, last, age, nat, `${first} ${last}`.toLowerCase());
  return Number(r.lastInsertRowid);
}

// Fixture with a deliberate group of ties on every sortable field, so the
// (sort_value, id) tie-break branch is actually exercised for each sort.
function buildTiedFixture(db: Database): number[] {
  const ids: number[] = [];
  // ties on age = 30
  ids.push(insertUser(db, 'Alice', 'Adams',  30, 'France'));
  ids.push(insertUser(db, 'Bob',   'Baker',  30, 'Germany'));
  ids.push(insertUser(db, 'Carol', 'Carter', 30, 'Italy'));
  // ties on first_name = 'Dan'
  ids.push(insertUser(db, 'Dan',   'Davis',  40, 'Japan'));
  ids.push(insertUser(db, 'Dan',   'Evans',  41, 'Kenya'));
  ids.push(insertUser(db, 'Dan',   'Foster', 42, 'Latvia'));
  // ties on last_name = 'Smith'
  ids.push(insertUser(db, 'Ed',    'Smith',  50, 'Mexico'));
  ids.push(insertUser(db, 'Fay',   'Smith',  51, 'Norway'));
  ids.push(insertUser(db, 'Gus',   'Smith',  52, 'Oman'));
  // ties on nationality = 'Spain'
  ids.push(insertUser(db, 'Hank',  'Hall',   60, 'Spain'));
  ids.push(insertUser(db, 'Ida',   'Ives',   61, 'Spain'));
  ids.push(insertUser(db, 'Jack',  'James',  62, 'Spain'));
  // fillers (no ties with anything above on any field)
  ids.push(insertUser(db, 'Kim',   'King',   70, 'Peru'));
  ids.push(insertUser(db, 'Leo',   'Lopez',  71, 'Qatar'));
  ids.push(insertUser(db, 'Mia',   'Miller', 72, 'Russia'));
  ids.push(insertUser(db, 'Ned',   'Nelson', 73, 'Sudan'));
  return ids;
}

function walkAllPages(
  repo: UserRepository,
  sort: SortField,
  dir: SortDir,
  pageSize = 4
): UserRow[] {
  const rows: UserRow[] = [];
  let cursor: { v: string | number; id: number } | null = null;
  for (let i = 0; i < 100; i++) {
    const page = repo.listPage({
      filter: { q: '', hobbies: [], nationalities: [] },
      sort,
      dir,
      cursor,
      limit: pageSize,
    });
    rows.push(...page);
    if (page.length < pageSize) break;
    const last = page[page.length - 1]!;
    cursor = { v: last[sort], id: last.id };
  }
  return rows;
}

function assertOrdered(rows: UserRow[], sort: SortField, dir: SortDir): void {
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!;
    const cur = rows[i]!;
    const pv = prev[sort];
    const cv = cur[sort];
    if (pv === cv) {
      expect(dir === 'asc' ? cur.id > prev.id : cur.id < prev.id).toBe(true);
    } else {
      expect(dir === 'asc' ? cv > pv : cv < pv).toBe(true);
    }
  }
}

const SORT_FIELDS: SortField[] = ['first_name', 'last_name', 'age', 'nationality'];
const DIRS: SortDir[] = ['asc', 'desc'];

describe('UserRepository.listPage — sort semantics', () => {
  let db: Database;
  let repo: UserRepository;
  let allIds: number[];

  beforeEach(() => {
    db = openDatabase(':memory:');
    allIds = buildTiedFixture(db);
    repo = new UserRepository(db);
  });
  afterEach(() => db.close());

  for (const sort of SORT_FIELDS) {
    for (const dir of DIRS) {
      it(`sort=${sort} dir=${dir}: covers every row exactly once, ordered with id tie-break`, () => {
        const rows = walkAllPages(repo, sort, dir);
        const ids = rows.map((r) => r.id);
        // no duplicates
        expect(new Set(ids).size).toBe(rows.length);
        // no gaps — every fixture row appears
        expect(new Set(ids)).toEqual(new Set(allIds));
        // ordering, including id tie-break
        assertOrdered(rows, sort, dir);
        // sanity: the fixture actually produced a tie for this sort field,
        // so the tie-break branch above was exercised (not vacuous).
        const seenTie = rows.some((r, i) => i > 0 && r[sort] === rows[i - 1]![sort]);
        expect(seenTie).toBe(true);
      });
    }
  }
});

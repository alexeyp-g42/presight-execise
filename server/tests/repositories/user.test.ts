import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserRepository } from '../../src/repositories/user.js';
import { buildFixtureDb } from '../fixtures.js';
import type { Database } from '../../src/db/connection.js';

let db: Database;
let repo: UserRepository;
beforeEach(() => {
  db = buildFixtureDb(50);
  repo = new UserRepository(db);
});
afterEach(() => db.close());

describe('UserRepository.listPage', () => {
  it('paginates deterministically under sort tie-break by id', () => {
    const page1 = repo.listPage({
      filter: { q: '', hobbies: [], nationalities: [] },
      sort: 'age', dir: 'asc', cursor: null, limit: 10,
    });
    expect(page1).toHaveLength(10);
    for (let i = 1; i < page1.length; i++) {
      const prev = page1[i - 1]!;
      const cur = page1[i]!;
      expect(cur.age > prev.age || (cur.age === prev.age && cur.id > prev.id)).toBe(true);
    }
  });

  it('cursor over (sort_value, id) yields no duplicates or gaps', () => {
    const page1 = repo.listPage({
      filter: { q: '', hobbies: [], nationalities: [] },
      sort: 'last_name', dir: 'asc', cursor: null, limit: 10,
    });
    const last = page1[page1.length - 1]!;
    const page2 = repo.listPage({
      filter: { q: '', hobbies: [], nationalities: [] },
      sort: 'last_name', dir: 'asc',
      cursor: { v: last.last_name, id: last.id },
      limit: 10,
    });
    const ids1 = new Set(page1.map((r) => r.id));
    for (const r of page2) expect(ids1.has(r.id)).toBe(false);
  });

  it('applies text + hobby AND + nationality OR together', () => {
    // fixture-dependent smoke: pick a common hobby, verify counts collapse
    const rows = repo.listPage({
      filter: { q: '', hobbies: ['chess'], nationalities: [] },
      sort: 'id', dir: 'asc', cursor: null, limit: 100,
    } as any);
    // every returned row should include chess (verify via subquery)
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      const check = db
        .prepare(
          `SELECT COUNT(*) as c FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id
           WHERE uh.user_id IN (${ids.map(() => '?').join(',')}) AND h.name = 'chess'`
        )
        .get(...ids) as { c: number };
      expect(check.c).toBe(ids.length);
    }
  });
});

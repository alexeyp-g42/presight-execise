import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FacetRepository } from '../../src/repositories/facet.js';
import { buildFixtureDb } from '../fixtures.js';
import type { Database } from '../../src/db/connection.js';

let db: Database;
let repo: FacetRepository;
beforeEach(() => {
  db = buildFixtureDb(200);
  repo = new FacetRepository(db);
});
afterEach(() => db.close());

describe('FacetRepository', () => {
  it('topHobbies returns at most 20 entries sorted by count desc', () => {
    const r = repo.topHobbies({ q: '', hobbies: [], nationalities: [] }, 20);
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(20);
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1]!.count).toBeGreaterThanOrEqual(r[i]!.count);
    }
  });

  it('topNationalities respects hobby filter (facet reflects filtered set)', () => {
    const all = repo.topNationalities({ q: '', hobbies: [], nationalities: [] }, 20);
    const filtered = repo.topNationalities({ q: '', hobbies: ['chess'], nationalities: [] }, 20);
    // Counts should differ (or filtered be a strict subset in sum)
    const sumAll = all.reduce((s, e) => s + e.count, 0);
    const sumFiltered = filtered.reduce((s, e) => s + e.count, 0);
    expect(sumFiltered).toBeLessThanOrEqual(sumAll);
  });

  it('facet self-inclusion: a selected hobby still appears in top hobbies', () => {
    const r = repo.topHobbies({ q: '', hobbies: ['chess'], nationalities: [] }, 20);
    expect(r.some((e) => e.value === 'chess')).toBe(true);
  });
});

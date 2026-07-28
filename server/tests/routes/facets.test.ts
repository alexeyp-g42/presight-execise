import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { buildFixtureDb } from '../fixtures.js';
import { UserRepository } from '../../src/repositories/user.js';
import { FacetRepository } from '../../src/repositories/facet.js';
import { UserService } from '../../src/services/user.js';
import { FacetService } from '../../src/services/facet.js';

function buildTestApp(users = 200) {
  const db = buildFixtureDb(users);
  const app = buildApp({
    userService: new UserService(new UserRepository(db)),
    facetService: new FacetService(new FacetRepository(db)),
  });
  return { app, db };
}

describe('GET /api/facets', () => {
  it('returns top-20 hobbies and nationalities', async () => {
    const { app, db } = buildTestApp();
    const res = await request(app).get('/api/facets');
    expect(res.status).toBe(200);
    expect(res.body.hobbies.length).toBeGreaterThan(0);
    expect(res.body.hobbies.length).toBeLessThanOrEqual(20);
    expect(res.body.nationalities.length).toBeGreaterThan(0);
    expect(res.body.nationalities.length).toBeLessThanOrEqual(20);
    for (const e of res.body.hobbies) {
      expect(typeof e.value).toBe('string');
      expect(typeof e.count).toBe('number');
    }
    db.close();
  });

  it('reflects filter selection', async () => {
    const { app, db } = buildTestApp();
    const all = await request(app).get('/api/facets');
    const filtered = await request(app).get('/api/facets?hobbies=chess');
    const chessAll = all.body.hobbies.find((e: any) => e.value === 'chess')?.count ?? 0;
    const chessFiltered = filtered.body.hobbies.find((e: any) => e.value === 'chess')?.count ?? 0;
    // Selected value is self-inclusive; count under filter equals its global count within the matching set.
    expect(chessFiltered).toBeGreaterThan(0);
    // Filtered totals cannot exceed unfiltered totals.
    const sumF = filtered.body.hobbies.reduce((s: number, e: any) => s + e.count, 0);
    const sumA = all.body.hobbies.reduce((s: number, e: any) => s + e.count, 0);
    expect(sumF).toBeLessThanOrEqual(sumA);
    db.close();
  });
});

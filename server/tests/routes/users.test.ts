import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { buildFixtureDb } from '../fixtures.js';
import { UserRepository } from '../../src/repositories/user.js';
import { FacetRepository } from '../../src/repositories/facet.js';
import { UserService } from '../../src/services/user.js';
import { FacetService } from '../../src/services/facet.js';

function buildTestApp(users = 50) {
  const db = buildFixtureDb(users);
  const app = buildApp({
    userService: new UserService(new UserRepository(db)),
    facetService: new FacetService(new FacetRepository(db)),
  });
  return { app, db };
}

describe('GET /api/users', () => {
  it('returns a page with default sort last_name asc', async () => {
    const { app, db } = buildTestApp(50);
    const res = await request(app).get('/api/users?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(10);
    expect(res.body).toHaveProperty('nextCursor');
    expect(res.body).toHaveProperty('hasMore', true);
    db.close();
  });

  it('follows cursor without duplicates', async () => {
    const { app, db } = buildTestApp(50);
    const r1 = await request(app).get('/api/users?limit=10&sort=first_name');
    const r2 = await request(app).get(`/api/users?limit=10&sort=first_name&cursor=${encodeURIComponent(r1.body.nextCursor)}`);
    const ids1 = new Set(r1.body.items.map((u: any) => u.id));
    for (const u of r2.body.items) expect(ids1.has(u.id)).toBe(false);
    db.close();
  });

  it('hobby filter is AND', async () => {
    const { app, db } = buildTestApp(200);
    const res = await request(app).get('/api/users?hobbies=chess,reading&limit=100');
    for (const u of res.body.items) {
      expect(u.hobbies).toContain('chess');
      expect(u.hobbies).toContain('reading');
    }
    db.close();
  });

  it('rejects invalid sort with 400', async () => {
    const { app, db } = buildTestApp(10);
    const res = await request(app).get('/api/users?sort=drop_table');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    db.close();
  });

  it('rejects malformed cursor with 400', async () => {
    const { app, db } = buildTestApp(10);
    const res = await request(app).get('/api/users?cursor=not-real');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_cursor');
    db.close();
  });
});

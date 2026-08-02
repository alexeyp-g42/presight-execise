import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createFixtureDb } from './fixtures.js';

const app = createApp(createFixtureDb());

describe('GET /api/users', () => {
  it('returns users with page info', async () => {
    const res = await request(app).get('/api/users?limit=5');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.page_info).toMatchObject({ total: 40, returned: 5, has_more: true });
    expect(res.body.page_info.next_cursor).toEqual(expect.any(String));
    expect(res.body.data[0]).toMatchObject({
      id: expect.any(Number),
      avatar: expect.any(String),
      first_name: expect.any(String),
      last_name: expect.any(String),
      age: expect.any(Number),
      nationality: expect.any(String),
      hobbies: expect.any(Array),
    });
  });

  it('follows a cursor without repeating rows', async () => {
    const first = await request(app).get('/api/users?limit=5');
    const second = await request(app).get(
      `/api/users?limit=5&cursor=${encodeURIComponent(first.body.page_info.next_cursor)}`,
    );

    expect(second.status).toBe(200);
    const firstIds: number[] = first.body.data.map((user: { id: number }) => user.id);
    const secondIds: number[] = second.body.data.map((user: { id: number }) => user.id);
    expect(firstIds.filter((id) => secondIds.includes(id))).toEqual([]);
  });

  it('rejects a cursor replayed against different filters', async () => {
    const first = await request(app).get('/api/users?limit=5');
    const res = await request(app).get(
      `/api/users?limit=5&q=ada&cursor=${encodeURIComponent(first.body.page_info.next_cursor)}`,
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });

  it('rejects a malformed cursor', async () => {
    const res = await request(app).get('/api/users?cursor=notacursor');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });

  it.each(['sort=email', 'order=sideways', 'limit=0', 'limit=500', 'limit=abc', 'page=2'])(
    'rejects %s with INVALID_QUERY',
    async (queryString) => {
      const res = await request(app).get(`/api/users?${queryString}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_QUERY');
    },
  );

  it('applies combined filters', async () => {
    const res = await request(app).get('/api/users?q=ada&nationalities=Nation01&hobbies=Hobby01');
    expect(res.body.data.map((user: { id: number }) => user.id)).toEqual([1, 2]);
  });

  it('returns an empty result set cleanly', async () => {
    const res = await request(app).get('/api/users?q=zzzznobody');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.page_info).toEqual({ total: 0, returned: 0, has_more: false, next_cursor: null });
  });
});

describe('GET /api/facets', () => {
  it('returns both facet lists', async () => {
    const res = await request(app).get('/api/facets');

    expect(res.status).toBe(200);
    expect(res.body.hobbies).toHaveLength(20);
    expect(res.body.nationalities).toHaveLength(20);
    expect(res.body.hobbies[0]).toMatchObject({ value: expect.any(String), count: expect.any(Number) });
  });

  it('scopes counts to the active filters', async () => {
    const res = await request(app).get('/api/facets?q=ada');
    expect(res.body.nationalities).toEqual([
      { value: 'Nation01', count: 2 },
      { value: 'Nation02', count: 1 },
    ]);
  });

  it('rejects sort, which does not affect facets', async () => {
    const res = await request(app).get('/api/facets?sort=age');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_QUERY');
  });
});

describe('GET /api/avatars', () => {
  it('renders an SVG with an immutable cache header', async () => {
    const res = await request(app).get('/api/avatars/AJ-3.svg');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/svg+xml');
    expect(res.headers['cache-control']).toContain('immutable');

    // supertest buffers image/* into res.body rather than res.text.
    const svg = Buffer.isBuffer(res.body) ? res.body.toString('utf8') : String(res.text);
    expect(svg).toContain('<svg');
    expect(svg).toContain('>AJ<');
  });

  it.each(['ab-3.svg', 'ABC-3.svg', 'AJ-99.svg', 'AJ-3.png', '<script>-1.svg'])(
    'rejects the malformed seed %s',
    async (seed) => {
      const res = await request(app).get(`/api/avatars/${encodeURIComponent(seed)}`);
      expect(res.status).toBe(404);
    },
  );
});

describe('GET /api/health', () => {
  it('reports the user count', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ status: 'ok', users: 40 });
  });
});

describe('unknown routes', () => {
  it('returns a NOT_FOUND envelope', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

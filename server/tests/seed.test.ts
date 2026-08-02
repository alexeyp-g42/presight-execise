import { describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { seedDatabase } from '../src/seed/seed.js';
import { avatarPath, hueFor } from '../src/seed/avatar.js';

function seeded(count: number): Db {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDatabase(db, count);
  return db;
}

describe('avatar seeds', () => {
  it('builds a path matching the avatar route pattern', () => {
    expect(avatarPath('Ada', 'Jensen')).toMatch(/^\/api\/avatars\/[A-Z]{1,2}-(\d|1[01])\.svg$/);
  });

  it('falls back to X for initials outside A-Z', () => {
    expect(avatarPath('Ólafur', '—')).toBe(`/api/avatars/XX-${hueFor('Ólafur —')}.svg`);
  });

  it('is deterministic', () => {
    expect(avatarPath('Ada', 'Jensen')).toBe(avatarPath('Ada', 'Jensen'));
  });

  it('spreads hues across the full range', () => {
    const hues = new Set(Array.from({ length: 200 }, (_, i) => hueFor(`name-${i}`)));
    expect(hues.size).toBe(12);
  });

  it('produces a path the avatar route can parse for every seeded user', () => {
    const paths = seeded(500)
      .prepare('SELECT avatar FROM users')
      .all()
      .map((row) => row.avatar as string);
    for (const path of paths) {
      expect(path).toMatch(/^\/api\/avatars\/[A-Z]{1,2}-(\d|1[01])\.svg$/);
    }
  });
});

describe('seedDatabase', () => {
  it('inserts the requested number of users', () => {
    expect(seeded(500).prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 500 });
  });

  it('is deterministic across runs', () => {
    const names = (db: Db) =>
      db.prepare('SELECT first_name, last_name, age, nationality FROM users ORDER BY id LIMIT 20').all();
    expect(names(seeded(500))).toEqual(names(seeded(500)));
  });

  it('gives every user between 0 and 10 hobbies', () => {
    const row = seeded(2000)
      .prepare(
        `SELECT MIN(c) AS lo, MAX(c) AS hi FROM (
           SELECT u.id, COUNT(uh.hobby_id) AS c
           FROM users u LEFT JOIN user_hobbies uh ON uh.user_id = u.id
           GROUP BY u.id)`,
      )
      .get() as { lo: number; hi: number };

    expect(row.lo).toBe(0);
    expect(row.hi).toBeGreaterThanOrEqual(9);
    expect(row.hi).toBeLessThanOrEqual(10);
  });

  it('produces a skewed hobby distribution rather than a uniform one', () => {
    const counts = seeded(3000)
      .prepare('SELECT COUNT(*) AS n FROM user_hobbies GROUP BY hobby_id ORDER BY n DESC')
      .all()
      .map((row) => row.n as number);

    expect(counts.length).toBeGreaterThan(20);
    expect(counts[0]!).toBeGreaterThan(counts[counts.length - 1]! * 5);
  });

  it('keeps ages within the documented range', () => {
    const row = seeded(1000).prepare('SELECT MIN(age) AS lo, MAX(age) AS hi FROM users').get() as {
      lo: number;
      hi: number;
    };
    expect(row.lo).toBeGreaterThanOrEqual(18);
    expect(row.hi).toBeLessThanOrEqual(75);
  });

  it('is idempotent', () => {
    const db = openDatabase(':memory:');
    migrate(db);
    seedDatabase(db, 300);
    seedDatabase(db, 300);
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 300 });
  });
});

import { describe, it, expect } from 'vitest';
import { buildFixtureDb } from '../fixtures';

describe('seedDatabase (fixture)', () => {
  it('produces a deterministic user + hobby count', () => {
    const db = buildFixtureDb(50);
    const users = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
    const hobbies = db.prepare('SELECT COUNT(*) as c FROM hobbies').get() as { c: number };
    const links = db.prepare('SELECT COUNT(*) as c FROM user_hobbies').get() as { c: number };
    expect(users.c).toBe(50);
    expect(hobbies.c).toBeGreaterThan(0);
    expect(links.c).toBeGreaterThan(0);
    db.close();
  });

  it('is reproducible', () => {
    const a = buildFixtureDb(20);
    const b = buildFixtureDb(20);
    const aFirst = a.prepare('SELECT first_name FROM users ORDER BY id LIMIT 5').all();
    const bFirst = b.prepare('SELECT first_name FROM users ORDER BY id LIMIT 5').all();
    expect(aFirst).toEqual(bFirst);
    a.close();
    b.close();
  });
});

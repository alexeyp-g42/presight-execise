import { describe, it, expect } from 'vitest';
import { openDatabase } from '../../src/db/connection.js';

describe('openDatabase', () => {
  it('creates tables and enables foreign keys', () => {
    const db = openDatabase(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name);
    expect(tables).toEqual(expect.arrayContaining(['users', 'hobbies', 'user_hobbies']));

    const fk = db.pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);

    db.close();
  });
});

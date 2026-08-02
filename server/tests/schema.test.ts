import { describe, expect, it } from 'vitest';
import { openDatabase } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';

function fresh() {
  const db = openDatabase(':memory:');
  migrate(db);
  return db;
}

describe('schema', () => {
  it('creates the three tables', () => {
    const names = fresh()
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all()
      .map((row) => row.name);
    expect(names).toEqual(['hobbies', 'user_hobbies', 'users']);
  });

  it('creates every sort and lookup index', () => {
    const names = fresh()
      .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name`)
      .all()
      .map((row) => row.name);
    expect(names).toEqual([
      'idx_user_hobbies_hobby',
      'idx_users_age',
      'idx_users_first_name',
      'idx_users_last_name',
      'idx_users_nationality',
    ]);
  });

  it('rejects duplicate hobby assignments', () => {
    const db = fresh();
    db.prepare(
      `INSERT INTO users (id, avatar, first_name, last_name, age, nationality)
       VALUES (1, '/a.svg', 'A', 'B', 30, 'Danish')`,
    ).run();
    db.prepare(`INSERT INTO hobbies (id, name) VALUES (1, 'Chess')`).run();
    db.prepare(`INSERT INTO user_hobbies (user_id, hobby_id) VALUES (1, 1)`).run();

    expect(() => db.prepare(`INSERT INTO user_hobbies (user_id, hobby_id) VALUES (1, 1)`).run()).toThrow();
  });

  it('enforces the foreign key to users', () => {
    const db = fresh();
    db.prepare(`INSERT INTO hobbies (id, name) VALUES (1, 'Chess')`).run();
    expect(() => db.prepare(`INSERT INTO user_hobbies (user_id, hobby_id) VALUES (99, 1)`).run()).toThrow();
  });

  it('sorts names case-insensitively', () => {
    const db = fresh();
    const insert = db.prepare(
      `INSERT INTO users (avatar, first_name, last_name, age, nationality)
       VALUES ('/a.svg', ?, 'X', 30, 'Danish')`,
    );
    for (const name of ['Zoe', 'alice', 'Bob']) insert.run(name);

    const order = db
      .prepare(`SELECT first_name FROM users ORDER BY first_name, id`)
      .all()
      .map((row) => row.first_name);

    // Binary collation would give ['Bob', 'Zoe', 'alice'].
    expect(order).toEqual(['alice', 'Bob', 'Zoe']);
  });
});

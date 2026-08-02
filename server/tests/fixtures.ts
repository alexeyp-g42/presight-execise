import { openDatabase, type Db } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';

/**
 * A 40-user fixture, hand-built so every expectation can be checked by reading
 * it. It deliberately contains repeated ages and first names (tie-breakers),
 * users with zero and with ten hobbies, LIKE metacharacters in a name,
 * mixed-case names (COLLATE NOCASE), and — importantly — more than twenty
 * distinct hobbies and nationalities, so the top-20 cap is genuinely exercised
 * rather than trivially satisfied.
 */
export interface FixtureUser {
  id: number;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export const HOBBY_POOL = Array.from({ length: 25 }, (_, i) => `Hobby${String(i + 1).padStart(2, '0')}`);
export const NATIONALITY_POOL = Array.from({ length: 22 }, (_, i) => `Nation${String(i + 1).padStart(2, '0')}`);

export const FIXTURE_USERS: FixtureUser[] = [
  // 1-3: same age and same first name (one lower-cased) — proves the id tie-breaker.
  { id: 1, first_name: 'Ada', last_name: 'Zephyr', age: 30, nationality: 'Nation01', hobbies: ['Hobby01', 'Hobby02'] },
  { id: 2, first_name: 'Ada', last_name: 'Young', age: 30, nationality: 'Nation01', hobbies: ['Hobby01'] },
  { id: 3, first_name: 'ada', last_name: 'Xavier', age: 30, nationality: 'Nation02', hobbies: [] },
  // 4: ten hobbies — the `+n` overflow case.
  { id: 4, first_name: 'Bo', last_name: 'Walsh', age: 41, nationality: 'Nation02', hobbies: HOBBY_POOL.slice(0, 10) },
  // 5-6: two-token name search targets, with the names mirrored.
  { id: 5, first_name: 'John', last_name: 'Smith', age: 52, nationality: 'Nation03', hobbies: ['Hobby01', 'Hobby03'] },
  { id: 6, first_name: 'Smith', last_name: 'Johnson', age: 52, nationality: 'Nation03', hobbies: ['Hobby03'] },
  // 7: LIKE metacharacters in the name.
  { id: 7, first_name: '50%', last_name: 'Off', age: 19, nationality: 'Nation04', hobbies: [] },
  // 8-40: fill out both pools past twenty distinct values.
  ...Array.from({ length: 33 }, (_, k): FixtureUser => ({
    id: 8 + k,
    first_name: `User${String(8 + k).padStart(2, '0')}`,
    last_name: `Last${String(8 + k).padStart(2, '0')}`,
    age: 20 + (k % 25),
    nationality: NATIONALITY_POOL[k % NATIONALITY_POOL.length]!,
    hobbies: [HOBBY_POOL[k % HOBBY_POOL.length]!, HOBBY_POOL[(k + 7) % HOBBY_POOL.length]!],
  })),
];

export function createFixtureDb(): Db {
  const db = openDatabase(':memory:');
  migrate(db);

  const insertUser = db.prepare(
    `INSERT INTO users (id, avatar, first_name, last_name, age, nationality) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertHobby = db.prepare(`INSERT INTO hobbies (id, name) VALUES (?, ?)`);
  const insertLink = db.prepare(`INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)`);

  db.exec('BEGIN');
  HOBBY_POOL.forEach((name, index) => insertHobby.run(index + 1, name));
  for (const user of FIXTURE_USERS) {
    insertUser.run(user.id, '/api/avatars/AA-1.svg', user.first_name, user.last_name, user.age, user.nationality);
    for (const hobby of user.hobbies) insertLink.run(user.id, HOBBY_POOL.indexOf(hobby) + 1);
  }
  db.exec('COMMIT');

  return db;
}

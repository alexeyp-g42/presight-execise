import { pathToFileURL } from 'node:url';
import { faker } from '@faker-js/faker';
import { config } from '../config.js';
import { openDatabase, type Db } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import { avatarPath } from './avatar.js';
import { HOBBIES, NATIONALITIES, weightedIndex, zipfWeights } from './vocabulary.js';

/** Fixed so the dataset — and therefore every count — is identical everywhere. */
const SEED = 20260802;

/**
 * Hobbies per user: 0-10, weighted toward 2-6 but with real mass at both ends.
 * The tails matter for the UI: index 0 produces cards with no hobbies, and
 * indices 9-10 produce the `+n` overflow case.
 */
const HOBBY_COUNT_WEIGHTS = [5, 8, 14, 16, 16, 14, 10, 7, 5, 3, 2];

export function seedDatabase(db: Db, userCount: number): void {
  faker.seed(SEED);

  const hobbyWeights = zipfWeights(HOBBIES.length);
  const nationalityWeights = zipfWeights(NATIONALITIES.length);

  const insertUser = db.prepare(
    `INSERT INTO users (id, avatar, first_name, last_name, age, nationality)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertHobby = db.prepare(`INSERT INTO hobbies (id, name) VALUES (?, ?)`);
  const insertLink = db.prepare(`INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)`);

  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM user_hobbies; DELETE FROM hobbies; DELETE FROM users;');
    HOBBIES.forEach((name, index) => insertHobby.run(index + 1, name));

    for (let id = 1; id <= userCount; id += 1) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const nationality = NATIONALITIES[weightedIndex(nationalityWeights, faker.number.float())] ?? 'American';

      insertUser.run(
        id,
        avatarPath(firstName, lastName),
        firstName,
        lastName,
        faker.number.int({ min: 18, max: 75 }),
        nationality,
      );

      const wanted = weightedIndex(HOBBY_COUNT_WEIGHTS, faker.number.float());
      const chosen = new Set<number>();
      // Sampling distinct values from a steep distribution can retry a lot;
      // the guard keeps an unlucky draw from spinning forever.
      for (let attempt = 0; chosen.size < wanted && attempt < wanted * 20; attempt += 1) {
        chosen.add(weightedIndex(hobbyWeights, faker.number.float()) + 1);
      }
      for (const hobbyId of chosen) insertLink.run(id, hobbyId);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const flag = process.argv.find((arg) => arg.startsWith('--users='));
  const count = flag ? Number(flag.slice('--users='.length)) : config.seedUsers;

  if (!Number.isInteger(count) || count < 1) {
    console.error(`Invalid user count: ${flag ?? count}`);
    process.exit(1);
  }

  const db = openDatabase(config.databasePath);
  migrate(db);

  const startedAt = performance.now();
  seedDatabase(db, count);
  const elapsed = Math.round(performance.now() - startedAt);

  const { links } = db.prepare('SELECT COUNT(*) AS links FROM user_hobbies').get() as { links: number };
  console.log(
    `Seeded ${count.toLocaleString()} users and ${links.toLocaleString()} hobby links ` +
      `into ${config.databasePath} in ${elapsed}ms`,
  );
  db.close();
}

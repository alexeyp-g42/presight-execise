import { openDatabase, type Database } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

export function buildFixtureDb(userCount = 50): Database {
  const db = openDatabase(':memory:');
  seedDatabase(db, { userCount, rngSeed: 42 });
  return db;
}

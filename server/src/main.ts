import { buildApp } from './app.js';
import { openDatabase } from './db/connection.js';
import { UserRepository } from './repositories/user.js';
import { FacetRepository } from './repositories/facet.js';
import { UserService } from './services/user.js';
import { FacetService } from './services/facet.js';
import { seedDatabase } from './db/seed.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const PORT = Number(process.env.PORT ?? 3001);
const DB_PATH = process.env.DB_PATH ?? './data/users.db';

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = openDatabase(DB_PATH);
const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
if (count.c === 0) {
  console.log(`empty db at ${DB_PATH}; seeding...`);
  seedDatabase(db);
}

const app = buildApp({
  userService: new UserService(new UserRepository(db)),
  facetService: new FacetService(new FacetRepository(db)),
});

app.listen(PORT, () => {
  console.log(`api listening on :${PORT}`);
});

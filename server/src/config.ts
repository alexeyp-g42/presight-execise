import { resolve } from 'node:path';

/**
 * `import.meta.dirname` is `server/src` when running through tsx and
 * `server/dist` after a build, so `../data/app.db` resolves to
 * `server/data/app.db` either way.
 */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  databasePath: process.env.DATABASE_PATH ?? resolve(import.meta.dirname, '../data/app.db'),
  seedUsers: Number(process.env.SEED_USERS ?? 50_000),
};

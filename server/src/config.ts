import path from "node:path";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  dbPath: process.env.DB_PATH ?? path.resolve(import.meta.dirname, "../data/users.db"),
  seedCount: Number(process.env.SEED_COUNT ?? 20000),
  staticDir: process.env.STATIC_DIR,
};

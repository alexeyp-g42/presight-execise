import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type Db = Database.Database;

export const openDatabase = (file: string): Db => {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
};

const migrate = (db: Db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      avatar TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      nationality TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hobbies (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS user_hobbies (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hobby_id INTEGER NOT NULL REFERENCES hobbies(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, hobby_id)
    ) WITHOUT ROWID;

    CREATE TABLE IF NOT EXISTS user_nationalities (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nationality TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, nationality)
    ) WITHOUT ROWID;

    CREATE INDEX IF NOT EXISTS idx_user_nationalities_nationality ON user_nationalities(nationality, user_id);
    CREATE INDEX IF NOT EXISTS idx_user_hobbies_hobby ON user_hobbies(hobby_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name, id);
    CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name, id);
    CREATE INDEX IF NOT EXISTS idx_users_age ON users(age, id);
    CREATE INDEX IF NOT EXISTS idx_users_nationality ON users(nationality, id);
  `);
};

export const isSeeded = (db: Db): boolean => {
  const row = db
    .prepare(
      `SELECT
        EXISTS (SELECT 1 FROM users) AS hasUsers,
        NOT EXISTS (
          SELECT 1 FROM users u
          WHERE NOT EXISTS (SELECT 1 FROM user_nationalities un WHERE un.user_id = u.id)
        ) AS hasNationalities`,
    )
    .get() as { hasUsers: number; hasNationalities: number };
  return row.hasUsers === 1 && row.hasNationalities === 1;
};

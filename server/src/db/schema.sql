CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  avatar        TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  age           INTEGER NOT NULL,
  nationality   TEXT NOT NULL,
  full_name_lc  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hobbies (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_hobbies (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hobby_id  INTEGER NOT NULL REFERENCES hobbies(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, hobby_id)
);

CREATE INDEX IF NOT EXISTS idx_users_nationality  ON users(nationality);
CREATE INDEX IF NOT EXISTS idx_users_last_name    ON users(last_name);
CREATE INDEX IF NOT EXISTS idx_users_first_name   ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_age          ON users(age);
CREATE INDEX IF NOT EXISTS idx_user_hobbies_hobby ON user_hobbies(hobby_id);

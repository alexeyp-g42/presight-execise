/**
 * The schema is inlined as a string rather than kept in a `.sql` file because
 * `tsc` does not copy non-TypeScript assets into `dist`, and adding a build
 * step for a single constant is not worth the moving part.
 *
 * Two deliberate modelling choices:
 *
 * - `hobbies` is normalised because it is a genuine many-to-many relation.
 * - `nationality` is a plain column on `users` because it is a low-cardinality
 *   scalar (~45 values). Keeping it on the row lets one composite index serve
 *   both `ORDER BY nationality` and the facet `GROUP BY`; a lookup table would
 *   force a join into every sort path and turn the ordering into a filesort.
 *
 * `COLLATE NOCASE` is declared at column level so the indexes are built with
 * that collation. Both `ORDER BY` and the keyset cursor comparison then agree,
 * which is what keeps pagination correct across case variants.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  avatar      TEXT    NOT NULL,
  first_name  TEXT    NOT NULL COLLATE NOCASE,
  last_name   TEXT    NOT NULL COLLATE NOCASE,
  age         INTEGER NOT NULL,
  nationality TEXT    NOT NULL COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS hobbies (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS user_hobbies (
  user_id  INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  hobby_id INTEGER NOT NULL REFERENCES hobbies(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, hobby_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_users_first_name   ON users(first_name, id);
CREATE INDEX IF NOT EXISTS idx_users_last_name    ON users(last_name, id);
CREATE INDEX IF NOT EXISTS idx_users_age          ON users(age, id);
CREATE INDEX IF NOT EXISTS idx_users_nationality  ON users(nationality, id);
CREATE INDEX IF NOT EXISTS idx_user_hobbies_hobby ON user_hobbies(hobby_id, user_id);
`;

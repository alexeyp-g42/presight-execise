import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/* The schema is TypeScript-first: this module is the source of truth and
   `pnpm --filter server db:generate` emits the committed SQL in `drizzle/`.
   `drizzle-kit push` was rejected — it drags a dev toolchain to wherever the
   database is created and leaves no SQL to read — and so was hand-written DDL,
   which drifts from these types in silence.

   Property names are snake_case on purpose. The wire format is snake_case
   throughout (see CONTEXT.md), so a row selected here is already the shape the
   API returns: column, TS property and JSON field are one name, with nothing in
   between that could drift. */

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey(),
    first_name: text('first_name').notNull(),
    last_name: text('last_name').notNull(),
    age: integer('age').notNull(),
    /* A display name — 'Germany', not 'DE'. Sorting by nationality is then a
       direct index-driven column sort with no lookup, and the value the API
       returns is the value the sidebar shows. */
    nationality: text('nationality').notNull(),
    /* Lowercased and diacritic-stripped, written by the seed (#18) and matched
       against at query time (#19) through the same `normalizeSearchText()`, so
       the stored column and the query term cannot fall out of step.

       Deliberately unindexed: `LIKE '%q%'` has a leading wildcard, which no
       B-tree can serve under any strategy. At 25,000 rows the scan is ~2-3ms. */
    search_name: text('search_name').notNull(),
  },
  (t) => [
    /* One `(sort_field, id)` composite per sort field. `id` tie-breaks in the
       sort's own direction (`last_name DESC, id DESC`) and SQLite walks an
       index either way, so these four serve all 8 sort permutations with zero
       temp B-trees and let `LIMIT` stop early. They are also exactly the shape
       keyset pagination needs (#20). `idx_users_nationality` does triple duty:
       sort field, `IN ()` filter, and facet `GROUP BY`. */
    index('idx_users_first_name').on(t.first_name, t.id),
    index('idx_users_last_name').on(t.last_name, t.id),
    index('idx_users_age').on(t.age, t.id),
    index('idx_users_nationality').on(t.nationality, t.id),
  ],
)

/* Hobbies are stored as text, not normalised into a dimension table. Every
   facet query and every card render would otherwise pay a join purely to
   recover a display string the API returns verbatim; there is no hobby
   metadata, no rename requirement and no write path. ~100k short strings is
   ~400KB.

   This table is WITHOUT ROWID — see `drizzle/0000_*.sql`, where that clause is
   appended by hand because Drizzle cannot express it. `test/db/schema.test.ts`
   asserts the applied table really is WITHOUT ROWID, so a regeneration that
   drops the clause fails the suite rather than silently doubling the storage. */
export const user_hobbies = sqliteTable(
  'user_hobbies',
  {
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    hobby: text('hobby').notNull(),
  },
  (t) => [
    /* The composite PK *is* the covering index for "this user's hobbies", and
       it hands them back alphabetically for free. */
    primaryKey({ columns: [t.user_id, t.hobby] }),
    /* The mirror image, covering the ALL-of hobby filter (#19) and the hobby
       facet's `GROUP BY` (#21) without touching the table. */
    index('idx_user_hobbies_hobby').on(t.hobby, t.user_id),
  ],
)

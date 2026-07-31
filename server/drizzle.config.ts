import { defineConfig } from 'drizzle-kit'

/* Generation only. `drizzle-kit` is a dev dependency and never reaches the
   runtime image: the container applies the committed SQL in `drizzle/` through
   `migrate()`, which lives in `drizzle-orm`. There are deliberately no
   `dbCredentials` here — `generate` diffs the schema against its own snapshot
   and needs no database, so nothing in this file can point a dev tool at a
   real one. */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
})

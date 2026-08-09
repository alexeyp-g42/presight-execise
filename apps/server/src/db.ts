import { DatabaseSync } from 'node:sqlite'
import { env } from './env.ts'

/** Package root, so `DATABASE_FILE` can stay a path relative to it (as in `.env.example`). */
const PACKAGE_ROOT = new URL('../', import.meta.url)

const DB_FILE = new URL(env.databaseFile, PACKAGE_ROOT)

/** Shared read-only connection. The API never writes, seeding is done by `pnpm run data:seed`. */
export const db = new DatabaseSync(DB_FILE.pathname, { readOnly: true })

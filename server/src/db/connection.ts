import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

export type Db = Database.Database

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql')

export function openDatabase(path: string): Db {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(readFileSync(schemaPath, 'utf8'))
  return db
}

export function hasData(db: Db): boolean {
  const row = db.prepare('SELECT EXISTS (SELECT 1 FROM users) AS present').get() as {
    present: number
  }
  return row.present === 1
}

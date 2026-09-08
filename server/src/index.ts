import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createApp } from './app.js'
import { hasData, openDatabase } from './db/connection.js'
import { seed } from './db/seed.js'

const port = Number(process.env.PORT ?? 4000)
const dbPath = process.env.DB_PATH ?? 'data/presight.db'
const clientDir = process.env.CLIENT_DIR ? resolve(process.env.CLIENT_DIR) : undefined

mkdirSync(dirname(dbPath), { recursive: true })
const db = openDatabase(dbPath)

if (process.env.SEED_ON_EMPTY === 'true' && !hasData(db)) {
  console.log('Database is empty, seeding 50000 users')
  const started = Date.now()
  seed(db, 50_000)
  console.log(`Seeding finished in ${Date.now() - started}ms`)
}

createApp(db, { clientDir }).listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})

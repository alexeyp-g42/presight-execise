import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { faker } from '@faker-js/faker'
import { openDatabase, type Db } from './connection.js'
import { HOBBIES, NATIONALITIES } from './vocabulary.js'

const HOBBY_COUNT_WEIGHTS = [
  { value: 0, weight: 6 },
  { value: 1, weight: 14 },
  { value: 2, weight: 24 },
  { value: 3, weight: 22 },
  { value: 4, weight: 15 },
  { value: 5, weight: 8 },
  { value: 6, weight: 5 },
  { value: 7, weight: 3 },
  { value: 8, weight: 2 },
  { value: 9, weight: 1 },
  { value: 10, weight: 1 },
]

export function seed(db: Db, userCount: number): void {
  faker.seed(20260908)

  const insertHobby = db.prepare('INSERT INTO hobbies (name) VALUES (?)')
  const insertUser = db.prepare(
    'INSERT INTO users (avatar, first_name, last_name, age, nationality) VALUES (?, ?, ?, ?, ?)',
  )
  const insertUserHobby = db.prepare(
    'INSERT OR IGNORE INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)',
  )

  db.transaction(() => {
    const hobbyIds = HOBBIES.map((name) => Number(insertHobby.run(name).lastInsertRowid))

    for (let index = 0; index < userCount; index += 1) {
      const sex = faker.person.sexType()
      const userId = Number(
        insertUser.run(
          faker.image.avatarGitHub(),
          faker.person.firstName(sex),
          faker.person.lastName(),
          faker.number.int({ min: 18, max: 72 }),
          faker.helpers.arrayElement(NATIONALITIES),
        ).lastInsertRowid,
      )

      const hobbyCount = faker.helpers.weightedArrayElement(HOBBY_COUNT_WEIGHTS)
      for (const hobbyId of faker.helpers.arrayElements(hobbyIds, hobbyCount)) {
        insertUserHobby.run(userId, hobbyId)
      }
    }
  })()
}

function runCli(): void {
  const path = process.env.DB_PATH ?? 'data/presight.db'
  const force = process.argv.includes('--force')

  if (existsSync(path)) {
    if (!force) {
      console.log(`${path} already exists. Re-run with --force to recreate it.`)
      return
    }
    rmSync(path, { force: true })
    rmSync(`${path}-wal`, { force: true })
    rmSync(`${path}-shm`, { force: true })
  }

  mkdirSync(dirname(path), { recursive: true })
  const db = openDatabase(path)
  const started = Date.now()
  seed(db, 50_000)
  db.close()
  console.log(`Seeded 50000 users into ${path} in ${Date.now() - started}ms`)
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runCli()
}

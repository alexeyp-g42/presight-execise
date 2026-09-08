import { openDatabase, type Db } from '../src/db/connection.js'

const USERS: Array<[string, string, number, string, string[]]> = [
  ['Ada', 'Byron', 36, 'British', ['Chess', 'Astronomy', 'Weaving']],
  ['Alan', 'Turing', 41, 'British', ['Chess', 'Running']],
  ['Ada', 'Lovelace', 36, 'British', ['Chess']],
  ['Grace', 'Hopper', 45, 'American', ['Chess', 'Sailing']],
  ['Katherine', 'Johnson', 52, 'American', ['Astronomy']],
  ['Hedy', 'Lamarr', 29, 'Austrian', ['Chess', 'Astronomy']],
  ['Ken', 'Thompson', 41, 'American', ['Chess', 'Sailing', 'Running']],
  ['Barbara', 'Liskov', 36, 'American', ['Running']],
]

export function createFixtureDb(): Db {
  const db = openDatabase(':memory:')
  const insertHobby = db.prepare('INSERT INTO hobbies (name) VALUES (?)')
  const insertUser = db.prepare(
    'INSERT INTO users (avatar, first_name, last_name, age, nationality) VALUES (?, ?, ?, ?, ?)',
  )
  const insertUserHobby = db.prepare(
    'INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)',
  )

  const hobbyIds = new Map<string, number>()
  for (const name of ['Chess', 'Astronomy', 'Weaving', 'Running', 'Sailing']) {
    hobbyIds.set(name, Number(insertHobby.run(name).lastInsertRowid))
  }

  for (const [firstName, lastName, age, nationality, hobbies] of USERS) {
    const userId = Number(
      insertUser.run(`avatar/${lastName}`, firstName, lastName, age, nationality).lastInsertRowid,
    )
    for (const hobby of hobbies) {
      insertUserHobby.run(userId, hobbyIds.get(hobby))
    }
  }

  return db
}

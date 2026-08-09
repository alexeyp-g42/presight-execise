import { DatabaseSync } from 'node:sqlite'
import { readFileSync, rmSync, mkdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { CSV_FILE, CSV_HEADER, DB_DIR, DB_FILE, HOBBIES, HOBBY_SEPARATOR, NATIONALITIES } from './data-files.ts'

/** Minimal RFC 4180 parser: handles quoted fields, escaped quotes and embedded newlines. */
function parseCsv(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i]

        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"'
                    i += 1
                } else {
                    inQuotes = false
                }
            } else {
                field += char
            }
            continue
        }

        if (char === '"') {
            inQuotes = true
        } else if (char === ',') {
            row.push(field)
            field = ''
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && text[i + 1] === '\n') i += 1
            row.push(field)
            rows.push(row)
            row = []
            field = ''
        } else {
            field += char
        }
    }

    if (field !== '' || row.length > 0) {
        row.push(field)
        rows.push(row)
    }

    return rows
}

const [header, ...dataRows] = parseCsv(readFileSync(CSV_FILE, 'utf8'))

if (!header || header.join(',') !== CSV_HEADER.join(',')) {
    throw new Error(`Unexpected CSV header, expected: ${CSV_HEADER.join(',')}`)
}

// Always rebuild the database from scratch.
mkdirSync(DB_DIR, { recursive: true })
for (const suffix of ['', '-wal', '-shm']) {
    rmSync(new URL(`${DB_FILE.href}${suffix}`), { force: true })
}

const db = new DatabaseSync(DB_FILE.pathname)

db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE nationalities (
        code  TEXT PRIMARY KEY,
        label TEXT NOT NULL UNIQUE
    );

    CREATE TABLE hobbies (
        id    TEXT PRIMARY KEY,
        label TEXT NOT NULL UNIQUE
    );

    CREATE TABLE users (
        id               TEXT PRIMARY KEY,
        avatar           TEXT NOT NULL,
        first_name       TEXT NOT NULL,
        last_name        TEXT NOT NULL,
        age              INTEGER NOT NULL CHECK (age BETWEEN 0 AND 120),
        nationality_code TEXT NOT NULL REFERENCES nationalities(code)
    );

    CREATE TABLE user_hobbies (
        user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hobby_id TEXT NOT NULL REFERENCES hobbies(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, hobby_id)
    );

    CREATE INDEX idx_users_nationality_code ON users(nationality_code);
    CREATE INDEX idx_users_age ON users(age);
    CREATE INDEX idx_user_hobbies_hobby_id ON user_hobbies(hobby_id);
`)

/** Short random hex id, e.g. "3e31e1". */
function randomId(): string {
    return randomBytes(3).toString('hex')
}

// Seed the full reference tables, independent of what ends up used by generated users.
const insertNationality = db.prepare('INSERT INTO nationalities (code, label) VALUES (?, ?)')
for (const { code, label } of NATIONALITIES) {
    insertNationality.run(code, label)
}

const insertHobby = db.prepare('INSERT INTO hobbies (id, label) VALUES (?, ?)')
const hobbyIdByLabel = new Map<string, string>()
const usedHobbyIds = new Set<string>()

for (const label of HOBBIES) {
    let id = randomId()
    while (usedHobbyIds.has(id)) id = randomId()
    usedHobbyIds.add(id)
    hobbyIdByLabel.set(label, id)
    insertHobby.run(id, label)
}

const insertUser = db.prepare(
    'INSERT INTO users (id, avatar, first_name, last_name, age, nationality_code) VALUES (?, ?, ?, ?, ?, ?)',
)
const insertUserHobby = db.prepare('INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)')

db.exec('BEGIN')
let hobbyCount = 0

for (const [id, avatar, firstName, lastName, age, nationalityCode, hobbies] of dataRows) {
    if (!id) continue

    insertUser.run(id, avatar!, firstName!, lastName!, Number(age), nationalityCode!)

    for (const label of (hobbies ?? '').split(HOBBY_SEPARATOR).filter(Boolean)) {
        const hobbyId = hobbyIdByLabel.get(label)
        if (!hobbyId) throw new Error(`Unknown hobby label in CSV: ${label}`)
        insertUserHobby.run(id, hobbyId)
        hobbyCount += 1
    }
}

db.exec('COMMIT')
db.close()

console.log(
    `Seeded ${NATIONALITIES.length} nationalities, ${HOBBIES.length} hobbies, ${dataRows.length} users and ${hobbyCount} user-hobby links -> ${DB_FILE.pathname}`,
)

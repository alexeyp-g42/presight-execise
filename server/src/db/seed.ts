import { faker } from '@faker-js/faker';
import type { Database } from './connection.js';

const HOBBIES = [
  'chess', 'reading', 'painting', 'cycling', 'running', 'swimming', 'hiking',
  'photography', 'gaming', 'cooking', 'baking', 'gardening', 'yoga', 'meditation',
  'writing', 'poetry', 'guitar', 'piano', 'singing', 'drumming', 'dancing',
  'climbing', 'surfing', 'skiing', 'snowboarding', 'sailing', 'kayaking', 'fishing',
  'astronomy', 'birdwatching', 'woodworking', 'pottery', 'knitting', 'sewing',
  'origami', 'calligraphy', 'sketching', 'sculpting', 'crocheting', 'quilting',
  'coding', 'robotics', 'electronics', 'model building', 'trainspotting', 'geocaching',
  'mycology', 'foraging', 'brewing', 'winemaking', 'travel', 'blogging', 'podcasting',
  'filmmaking', 'video editing', 'streaming', 'esports', 'chess boxing', 'kickboxing',
  'karate', 'judo', 'aikido', 'taekwondo', 'fencing', 'archery', 'shooting',
  'darts', 'billiards', 'bowling', 'golf', 'tennis', 'badminton', 'squash',
  'basketball', 'volleyball', 'football', 'rugby', 'cricket', 'baseball', 'hockey',
  'lacrosse', 'rowing', 'triathlon', 'crossfit', 'weightlifting', 'powerlifting',
  'parkour', 'skateboarding', 'longboarding', 'roller skating', 'ice skating',
  'juggling', 'magic tricks', 'chess strategy', 'go', 'shogi', 'bridge',
  'mahjong', 'poker', 'crossword', 'sudoku',
];

const NATIONALITIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Italy', 'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Sweden', 'Norway',
  'Denmark', 'Finland', 'Iceland', 'Ireland', 'Poland', 'Czech Republic', 'Austria',
  'Switzerland', 'Greece', 'Turkey', 'Ukraine', 'Russia', 'Japan', 'China',
  'South Korea', 'India', 'Pakistan', 'Bangladesh', 'Indonesia', 'Thailand',
  'Vietnam', 'Philippines', 'Malaysia', 'Singapore', 'Brazil', 'Argentina',
  'Chile', 'Mexico', 'Colombia', 'Peru', 'Egypt', 'South Africa', 'Nigeria',
  'Kenya', 'Morocco', 'Israel', 'Saudi Arabia',
];

export interface SeedOptions {
  userCount?: number;
  rngSeed?: number;
}

export function seedDatabase(db: Database, opts: SeedOptions = {}): void {
  const userCount = opts.userCount ?? 5000;
  const rngSeed = opts.rngSeed ?? 42;
  faker.seed(rngSeed);

  const insertHobby = db.prepare('INSERT OR IGNORE INTO hobbies (name) VALUES (?)');
  const selectHobbyId = db.prepare('SELECT id FROM hobbies WHERE name = ?');
  const insertUser = db.prepare(
    `INSERT INTO users (avatar, first_name, last_name, age, nationality, full_name_lc)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const linkHobby = db.prepare('INSERT OR IGNORE INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)');

  const hobbyIds = new Map<string, number>();
  const seedAll = db.transaction(() => {
    for (const name of HOBBIES) {
      insertHobby.run(name);
      const row = selectHobbyId.get(name) as { id: number };
      hobbyIds.set(name, row.id);
    }

    for (let i = 0; i < userCount; i++) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const age = faker.number.int({ min: 18, max: 85 });
      const nat = faker.helpers.arrayElement(NATIONALITIES);
      const avatar = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(first + last + i)}`;
      const fullLc = `${first} ${last}`.toLowerCase();
      const result = insertUser.run(avatar, first, last, age, nat, fullLc);
      const userId = Number(result.lastInsertRowid);

      const hobbyCount = faker.helpers.weightedArrayElement([
        { value: 0, weight: 1 },
        { value: 1, weight: 3 },
        { value: 2, weight: 6 },
        { value: 3, weight: 8 },
        { value: 4, weight: 7 },
        { value: 5, weight: 5 },
        { value: 6, weight: 3 },
        { value: 7, weight: 2 },
        { value: 8, weight: 1 },
        { value: 9, weight: 1 },
        { value: 10, weight: 1 },
      ]);
      const chosen = faker.helpers.arrayElements(HOBBIES, hobbyCount);
      for (const h of chosen) {
        linkHobby.run(userId, hobbyIds.get(h)!);
      }
    }
  });
  seedAll();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { openDatabase } = await import('./connection.js');
  const path = process.env.DB_PATH ?? './data/users.db';
  const db = openDatabase(path);
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (count.c > 0) {
    console.log(`db already has ${count.c} users; skipping seed`);
  } else {
    seedDatabase(db);
    console.log(`seeded ${5000} users at ${path}`);
  }
  db.close();
}

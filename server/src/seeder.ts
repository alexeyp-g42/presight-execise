import { faker } from "@faker-js/faker";
import type { Db } from "./db.js";

export const NATIONALITIES = [
  "American",
  "British",
  "Canadian",
  "German",
  "French",
  "Italian",
  "Spanish",
  "Portuguese",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Polish",
  "Czech",
  "Austrian",
  "Swiss",
  "Irish",
  "Greek",
  "Turkish",
  "Emirati",
  "Saudi",
  "Egyptian",
  "Moroccan",
  "Nigerian",
  "Kenyan",
  "South African",
  "Indian",
  "Pakistani",
  "Chinese",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Filipino",
  "Australian",
  "New Zealander",
  "Brazilian",
  "Argentinian",
  "Mexican",
  "Chilean",
  "Colombian",
  "Ukrainian",
];

export const HOBBIES = [
  "Reading",
  "Running",
  "Cycling",
  "Swimming",
  "Hiking",
  "Cooking",
  "Baking",
  "Gardening",
  "Photography",
  "Painting",
  "Drawing",
  "Writing",
  "Chess",
  "Gaming",
  "Yoga",
  "Dancing",
  "Singing",
  "Guitar",
  "Piano",
  "Fishing",
  "Camping",
  "Climbing",
  "Skiing",
  "Surfing",
  "Tennis",
  "Football",
  "Basketball",
  "Volleyball",
  "Golf",
  "Knitting",
  "Pottery",
  "Woodworking",
  "Traveling",
  "Birdwatching",
  "Astronomy",
  "Coding",
  "Board Games",
  "Martial Arts",
  "Skateboarding",
  "Calligraphy",
  "Podcasting",
  "Film",
  "Meditation",
  "Volunteering",
  "Sailing",
];

const MAX_HOBBIES = 10;
const DUAL_NATIONALITY_RATE = 0.15;

const AGE_GROUPS = [
  { weight: 18, value: { min: 0, max: 17 } },
  { weight: 62, value: { min: 18, max: 64 } },
  { weight: 17, value: { min: 65, max: 89 } },
  { weight: 3, value: { min: 90, max: 100 } },
];

const skewedPick = <T>(items: T[]): T => {
  const index = Math.floor(items.length * faker.number.float({ min: 0, max: 1 }) ** 2);
  return items[Math.min(index, items.length - 1)];
};

const pickAge = () => faker.number.int(faker.helpers.weightedArrayElement(AGE_GROUPS));

const pickNationalities = (): string[] => {
  const primary = skewedPick(NATIONALITIES);
  if (!faker.datatype.boolean(DUAL_NATIONALITY_RATE)) {
    return [primary];
  }
  const secondary = faker.helpers.arrayElement(
    NATIONALITIES.filter((nationality) => nationality !== primary),
  );
  return [primary, secondary];
};

const pickHobbies = (): string[] => {
  const count = faker.number.int({ min: 0, max: MAX_HOBBIES });
  const picked = new Set<string>();
  while (picked.size < count) {
    picked.add(skewedPick(HOBBIES));
  }
  return [...picked];
};

export const seedDatabase = (db: Db, count: number, seed = 42) => {
  faker.seed(seed);

  const insertHobby = db.prepare("INSERT INTO hobbies (name) VALUES (?)");
  const insertUser = db.prepare(
    "INSERT INTO users (avatar, first_name, last_name, age, nationality) VALUES (?, ?, ?, ?, ?)",
  );
  const insertUserHobby = db.prepare("INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)");
  const insertUserNationality = db.prepare(
    "INSERT INTO user_nationalities (user_id, nationality, is_primary) VALUES (?, ?, ?)",
  );

  const run = db.transaction(() => {
    db.exec(
      "DELETE FROM user_hobbies; DELETE FROM user_nationalities; DELETE FROM users; DELETE FROM hobbies;",
    );

    const hobbyIds = new Map<string, number>();
    for (const name of HOBBIES) {
      hobbyIds.set(name, Number(insertHobby.run(name).lastInsertRowid));
    }

    for (let i = 0; i < count; i++) {
      const sex = faker.person.sexType();
      const firstName = faker.person.firstName(sex);
      const lastName = faker.person.lastName();
      const avatar = `https://i.pravatar.cc/128?u=${encodeURIComponent(`${firstName}-${lastName}-${i}`)}`;
      const age = pickAge();
      const [nationality, ...otherNationalities] = pickNationalities();

      const userId = Number(insertUser.run(avatar, firstName, lastName, age, nationality).lastInsertRowid);
      insertUserNationality.run(userId, nationality, 1);
      for (const other of otherNationalities) {
        insertUserNationality.run(userId, other, 0);
      }
      for (const hobby of pickHobbies()) {
        insertUserHobby.run(userId, hobbyIds.get(hobby));
      }
    }
  });

  run();
};

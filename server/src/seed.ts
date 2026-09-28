import { config } from "./config.js";
import { openDatabase } from "./db.js";
import { seedDatabase } from "./seeder.js";

const count = Number(process.argv[2] ?? config.seedCount);
const db = openDatabase(config.dbPath);

console.time("seed");
seedDatabase(db, count);
console.timeEnd("seed");
console.log(`Seeded ${count} users into ${config.dbPath}`);

db.close();

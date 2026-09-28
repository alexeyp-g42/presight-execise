import { createApp } from "./app.js";
import { config } from "./config.js";
import { isSeeded, openDatabase } from "./db.js";
import { seedDatabase } from "./seeder.js";

const db = openDatabase(config.dbPath);

if (!isSeeded(db)) {
  console.log(`Seeding ${config.seedCount} users...`);
  seedDatabase(db, config.seedCount);
}

const app = createApp(db, { staticDir: config.staticDir });

const server = app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

const shutdown = () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

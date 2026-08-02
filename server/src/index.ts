import { config } from './config.js';
import { openDatabase } from './db/connection.js';
import { migrate } from './db/migrate.js';
import { createApp } from './app.js';

const db = openDatabase(config.databasePath);
migrate(db);

const { users } = db.prepare('SELECT COUNT(*) AS users FROM users').get() as unknown as {
  users: number;
};
if (users === 0) {
  console.warn('Database is empty. Run `yarn seed` before using the API.');
}

createApp(db).listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port} (${users.toLocaleString()} users)`);
});

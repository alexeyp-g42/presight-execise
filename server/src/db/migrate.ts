import type { Db } from './connection.js';
import { SCHEMA_SQL } from './schema.js';

export function migrate(db: Db): void {
  db.exec(SCHEMA_SQL);
}

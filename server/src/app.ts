import express, { type Express } from 'express';
import type { Db } from './db/connection.js';
import { createUsersRouter } from './users/users.router.js';
import { createAvatarsRouter } from './avatars/avatars.router.js';
import { errorHandler, notFoundHandler } from './common/errors.js';

/**
 * Takes the database as an argument and never listens, which is what lets the
 * tests drive the real app against an in-memory fixture with no ports and no
 * lifecycle to manage.
 */
export function createApp(db: Db): Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_req, res) => {
    const { users } = db.prepare('SELECT COUNT(*) AS users FROM users').get() as unknown as {
      users: number;
    };
    res.json({ status: 'ok', users });
  });

  app.use('/api', createUsersRouter(db));
  app.use('/api', createAvatarsRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

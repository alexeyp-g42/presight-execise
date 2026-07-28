import express, { type Express } from 'express';
import { healthRouter } from './routes/health.js';
import { usersRouter } from './routes/users.js';
import { facetsRouter } from './routes/facets.js';
import { errorMiddleware } from './errors.js';
import type { UserService } from './services/user.js';
import type { FacetService } from './services/facet.js';

export interface AppDeps {
  userService?: UserService;
  facetService?: FacetService;
}

export function buildApp(deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use('/api/health', healthRouter());
  if (deps.userService) app.use('/api/users', usersRouter(deps.userService));
  if (deps.facetService) app.use('/api/facets', facetsRouter(deps.facetService));
  app.use(errorMiddleware);
  return app;
}

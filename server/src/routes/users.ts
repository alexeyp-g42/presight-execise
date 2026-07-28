import { Router, type Request, type Response, type NextFunction } from 'express';
import type { UserService } from '../services/user.js';
import { parseUsersQuery } from '../validation/params.js';

export function usersRouter(service: UserService): Router {
  const router = Router();
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = parseUsersQuery(req.query);
      const result = service.list(parsed);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });
  return router;
}

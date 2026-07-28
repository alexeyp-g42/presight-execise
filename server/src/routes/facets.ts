import { Router, type Request, type Response, type NextFunction } from 'express';
import type { FacetService } from '../services/facet.js';
import { parseFacetsQuery } from '../validation/params.js';

export function facetsRouter(service: FacetService): Router {
  const router = Router();
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = parseFacetsQuery(req.query);
      res.json(service.top(parsed));
    } catch (e) {
      next(e);
    }
  });
  return router;
}

import type { ErrorRequestHandler } from 'express';
import { ValidationError } from './validation/params.js';
import { InvalidCursorError } from './queries/cursor.js';

export class NotFoundError extends Error {
  constructor(message = 'not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: { code: 'validation_error', message: err.message } });
    return;
  }
  if (err instanceof InvalidCursorError) {
    res.status(400).json({ error: { code: 'invalid_cursor', message: err.message } });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { code: 'not_found', message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: 'internal server error' } });
};

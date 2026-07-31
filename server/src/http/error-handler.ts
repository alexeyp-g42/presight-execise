import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { ApiError, type ApiErrorBody, type FieldError } from './api-error.ts'

/* Last route in the stack: anything that reached it matched nothing. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `No route matches ${req.method} ${req.originalUrl}`))
}

/* The single exit for every failure in the app. One middleware rather than
   per-route handling, so no route can invent its own error shape. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  /* A failure after the response has started is the one case Express must
     finish itself — it destroys the socket rather than appending JSON to a body
     already on the wire. */
  if (res.headersSent) {
    next(error)
    return
  }

  const { status, body } = toResponse(error)

  if (status >= 500) {
    /* Swallowed for the client, kept for the operator: the stack is the only
       way to find this later, and it is the one thing that must not ship. */
    console.error('Unhandled error while serving a request:', error)
  }

  res.status(status).json(body)
}

const toResponse = (error: unknown): { status: number; body: ApiErrorBody } => {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message, ...details(error.details) } },
    }
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters',
          details: error.issues.map(
            (issue): FieldError => ({
              /* Empty for a whole-object failure — an unrecognized key reports
                 against the query string itself, not against a field. */
              field: issue.path.join('.') || '(query)',
              message: issue.message,
            }),
          ),
        },
      },
    }
  }

  /* Deliberately says nothing. The message of an unexpected error tends to
     carry connection strings, file paths and internal hostnames. */
  return {
    status: 500,
    body: { error: { code: 'INTERNAL', message: 'Something went wrong' } },
  }
}

/* `details` is absent rather than `undefined` when there is nothing to say —
   `JSON.stringify` drops an undefined value, but the objects are compared in
   tests before they are serialised. */
const details = (fieldErrors: FieldError[] | undefined) =>
  fieldErrors === undefined ? {} : { details: fieldErrors }

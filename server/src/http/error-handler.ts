import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { ApiError, type ApiErrorBody, type FieldError } from './api-error.ts'

/* Last route in the stack: anything that reached it matched nothing. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError('NOT_FOUND', `No route matches ${req.method} ${req.originalUrl}`))
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

  const apiError = toApiError(error)

  if (apiError.status >= 500) {
    /* Swallowed for the client, kept for the operator: the stack is the only
       way to find this later, and it is the one thing that must not ship. */
    console.error('Unhandled error while serving a request:', error)
  }

  res.status(apiError.status).json(toBody(apiError))
}

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error

  /* Validation lands here as a `ZodError` from the query-string boundary.
     Zod's own `flatten()` was rejected as the wire shape: it leaks the
     validation library into the public contract and carries no stable code. */
  if (error instanceof ZodError) {
    return new ApiError(
      'INVALID_QUERY',
      'Invalid query parameters',
      error.issues.map(
        (issue): FieldError => ({
          /* Empty for a whole-object failure — an unrecognized key reports
             against the query string itself, not against a field. */
          field: issue.path.join('.') || '(query)',
          message: issue.message,
        }),
      ),
    )
  }

  /* Deliberately says nothing. The message of an unexpected error tends to
     carry connection strings, file paths and internal hostnames. */
  return new ApiError('INTERNAL', 'Something went wrong')
}

const toBody = ({ code, message, details }: ApiError): ApiErrorBody => ({
  /* `details` is left out entirely rather than set to `undefined`: the two
     serialise identically, but only one of them compares equal to an envelope
     without it. */
  error: { code, message, ...(details === undefined ? {} : { details }) },
})

/* The whole 4xx/5xx vocabulary of the API, in one place. Five codes cover every
   way a request can fail here, and the client switches on the code rather than
   parsing prose. RFC 9457 Problem Details was rejected — its required `type`
   URI would be fiction on a three-endpoint API. */
export const ERROR_CODES = [
  /* A query string that does not validate: unknown key, unknown sort field,
     out-of-range limit. Never a silent correction. */
  'INVALID_QUERY',
  /* A cursor that is not a cursor — truncated, re-encoded, hand-edited. */
  'INVALID_CURSOR',
  /* A well-formed cursor replayed under a different sort than it was minted
     under, which would otherwise return wrong rows in silence. */
  'CURSOR_SORT_MISMATCH',
  'NOT_FOUND',
  'INTERNAL',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export type FieldError = { field: string; message: string }

export type ApiErrorBody = {
  error: { code: ErrorCode; message: string; details?: FieldError[] }
}

/* Thrown by any layer; Express 5 forwards it to the error middleware from sync
   and async handlers alike, so routes need no try/catch and no wrapper. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly details: FieldError[] | undefined

  constructor(status: number, code: ErrorCode, message: string, details?: FieldError[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

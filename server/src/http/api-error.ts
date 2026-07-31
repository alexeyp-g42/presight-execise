/* The whole 4xx/5xx vocabulary of the API, in one table. Five codes cover every
   way a request can fail here, and the client switches on the code rather than
   parsing prose. RFC 9457 Problem Details was rejected — its required `type`
   URI would be fiction on a three-endpoint API.

   Status lives beside the code rather than at the throw site: each code means
   exactly one status, and a caller free to pair them would eventually ship a
   `200 NOT_FOUND`. */
export const ERROR_STATUS = {
  /* A query string that does not validate: unknown key, unknown sort field,
     out-of-range limit. Never a silent correction. */
  INVALID_QUERY: 400,
  /* A cursor that is not a cursor — truncated, re-encoded, hand-edited. */
  INVALID_CURSOR: 400,
  /* A well-formed cursor replayed under a different sort than it was minted
     under, which would otherwise return wrong rows in silence. */
  CURSOR_SORT_MISMATCH: 400,
  NOT_FOUND: 404,
  INTERNAL: 500,
} as const

export type ErrorCode = keyof typeof ERROR_STATUS

export type FieldError = { field: string; message: string }

export type ApiErrorBody = {
  error: { code: ErrorCode; message: string; details?: FieldError[] }
}

/* Thrown by any layer; Express 5 forwards it to the error middleware from sync
   and async handlers alike, so routes need no try/catch and no wrapper. */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details: FieldError[] | undefined

  constructor(code: ErrorCode, message: string, details?: FieldError[]) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = ERROR_STATUS[code]
    this.details = details
  }
}

import { Buffer } from 'node:buffer'
import { SORT_DIRS, SORT_FIELDS, type SortDir, type SortField } from '@presight/shared'
import { z } from 'zod'
import { ApiError } from '../http/api-error.ts'

/* The token that advances pagination. Keyset rather than offset — and not for
   the usual two reasons, both of which are void here: offset drift is impossible
   on a read-only, seeded-once dataset, and `LIMIT 50 OFFSET 24950` over 25,000
   rows is microseconds. What decided it:
 *
 * 1. the `(sort_field, id)` composites the sort already needs are exactly the
 *    index a keyset row-value comparison seeks on, so the expensive
 *    prerequisite was paid by an earlier decision;
 * 2. one parameterised code path covers all 8 sort permutations;
 * 3. the token carries the sort and direction it was **minted under**, so a
 *    stale cursor is a 400 rather than silently wrong rows. Offset has no
 *    equivalent — `OFFSET 350` means something under every sort, and something
 *    different under each.
 *
 * Opaque on purpose: base64url over JSON, never a page number. `page_info` is
 * the only place it appears, and it deliberately does *not* round-trip through
 * the shared URL, so a reload always restarts from the first page. */

/* Strict, because this describes a token the API itself minted: an extra key is
   not a forward-compatible client, it is a hand edit. */
const cursorEnvelope = z.strictObject({
  sort: z.enum(SORT_FIELDS),
  dir: z.enum(SORT_DIRS),
  /** The row's value in the active sort field — where the next seek starts. */
  value: z.union([z.string(), z.number()]),
  id: z.int().positive(),
})

/* Keyed by `SortField` so it is stated once and cannot drift from the contract:
   a fifth sort field is a compile error here until its value type is declared.
   The check it feeds is not decoration — a hand-edited `{"sort":"age","value":
   "old"}` would reach an INTEGER-affinity column as text, compare under SQLite's
   type ordering where every number sorts before every string, and quietly
   return the whole result set instead of the rows after the cursor. */
const CURSOR_VALUE_TYPE = {
  first_name: 'string',
  last_name: 'string',
  age: 'number',
  nationality: 'string',
} satisfies Record<SortField, 'string' | 'number'>

const cursorSchema = cursorEnvelope.refine(
  ({ sort, value }) => typeof value === CURSOR_VALUE_TYPE[sort],
  'The cursor value does not match the type of the field it sorts by',
)

export type Cursor = z.output<typeof cursorSchema>

export const encodeCursor = (cursor: Cursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url')

/** The sort a request asked for, which the cursor has to have been minted under. */
export type ActiveSort = { sort: SortField; dir: SortDir }

/* Throws rather than returning a result: both failures are `ApiError`s with
   codes of their own, and Express 5 forwards a throw from the handler to the
   error middleware — so the call site stays one expression with no try/catch.
 *
 * The two are checked in this order deliberately. A token that does not decode
 * to a cursor at all cannot be said to disagree about the sort, so shape is
 * settled first and `CURSOR_SORT_MISMATCH` is reserved for a *well-formed*
 * cursor pointed at the wrong ordering. */
export const decodeCursor = (token: string, active: ActiveSort): Cursor => {
  const decoded = cursorSchema.safeParse(fromBase64url(token))

  if (!decoded.success) {
    throw new ApiError('INVALID_CURSOR', 'The cursor is not one this API minted')
  }

  const cursor = decoded.data

  if (cursor.sort !== active.sort || cursor.dir !== active.dir) {
    throw new ApiError(
      'CURSOR_SORT_MISMATCH',
      `This cursor was minted under ${cursor.sort} ${cursor.dir}, but the request sorts by ${active.sort} ${active.dir}. Start again without it.`,
    )
  }

  return cursor
}

/* Base64 decoding is lenient — Node drops characters outside the alphabet
   rather than failing — so the decode itself proves nothing about the token.
   `JSON.parse` and the schema above are the real gate; `undefined` here just
   means "whatever this was, it was not a cursor" and fails that gate. */
const fromBase64url = (token: string): unknown => {
  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))
  } catch {
    return undefined
  }
}

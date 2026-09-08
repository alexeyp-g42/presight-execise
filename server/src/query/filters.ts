import { z } from 'zod'

export type SortField = 'first_name' | 'last_name' | 'age' | 'nationality'
export type SortOrder = 'asc' | 'desc'

export interface FilterState {
  q: string
  nationalities: string[]
  hobbies: string[]
  sort: SortField
  order: SortOrder
}

export interface Cursor {
  v: string | number
  id: number
}

export interface PageRequest extends FilterState {
  cursor: Cursor | null
  limit: number
}

export class QueryError extends Error {
  readonly code = 'INVALID_QUERY'

  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message)
    this.name = 'QueryError'
  }
}

const toList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    const raw = value === undefined ? [] : Array.isArray(value) ? value : [value]
    return [...new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0))]
  })

const filterSchema = z.object({
  q: z.string().optional().default('').transform((value) => value.trim()),
  nationalities: toList,
  hobbies: toList,
  sort: z.enum(['first_name', 'last_name', 'age', 'nationality']).optional().default('first_name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
})

const pageSchema = filterSchema.extend({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
})

export function encodeCursor(value: string | number, id: number): string {
  return Buffer.from(JSON.stringify({ v: value, id }), 'utf8').toString('base64url')
}

function decodeCursor(raw: string): Cursor {
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  } catch {
    throw new QueryError('Cursor is not decodable', 'cursor')
  }

  const shape = z.object({ v: z.union([z.string(), z.number()]), id: z.number().int() })
  const result = shape.safeParse(parsed)
  if (!result.success) {
    throw new QueryError('Cursor payload is malformed', 'cursor')
  }
  return result.data
}

function unwrap<T>(result: z.SafeParseReturnType<unknown, T>): T {
  if (result.success) {
    return result.data
  }
  const issue = result.error.issues[0]
  throw new QueryError(issue.message, issue.path.join('.') || 'query')
}

export function parseFilterState(query: unknown): FilterState {
  return unwrap(filterSchema.safeParse(query))
}

export function parsePageRequest(query: unknown): PageRequest {
  const parsed = unwrap(pageSchema.safeParse(query))
  const { cursor, ...rest } = parsed
  return { ...rest, cursor: cursor === undefined ? null : decodeCursor(cursor) }
}

import { z } from 'zod'

/**
 * `nationalities` table.
 *
 * CREATE TABLE nationalities (
 *     code  TEXT PRIMARY KEY,
 *     label TEXT NOT NULL UNIQUE
 * );
 */
export const nationalitySchema = z.object({
    code: z.string().min(1),
    label: z.string().min(1),
})

export type Nationality = z.infer<typeof nationalitySchema>

/** Response body of `GET /nationalities`. */
export const nationalityListSchema = z.array(nationalitySchema)

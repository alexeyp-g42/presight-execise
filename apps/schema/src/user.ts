import { z } from 'zod'

/**
 * `users` table.
 *
 * CREATE TABLE users (
 *     id               TEXT PRIMARY KEY,
 *     avatar           TEXT NOT NULL,
 *     first_name       TEXT NOT NULL,
 *     last_name        TEXT NOT NULL,
 *     age              INTEGER NOT NULL CHECK (age BETWEEN 0 AND 120),
 *     nationality_code TEXT NOT NULL REFERENCES nationalities(code)
 * );
 */
export const userSchema = z.object({
    id: z.string().min(1),
    avatar: z.url(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    age: z.number().int().min(0).max(120),
    nationality_code: z.string().min(1),
})

export type User = z.infer<typeof userSchema>

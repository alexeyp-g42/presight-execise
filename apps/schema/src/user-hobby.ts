import { z } from 'zod'

/**
 * `user_hobbies` table (many-to-many join between `users` and `hobbies`).
 *
 * CREATE TABLE user_hobbies (
 *     user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *     hobby_id TEXT NOT NULL REFERENCES hobbies(id) ON DELETE CASCADE,
 *     PRIMARY KEY (user_id, hobby_id)
 * );
 */
export const userHobbySchema = z.object({
    user_id: z.string().min(1),
    hobby_id: z.string().min(1),
})

export type UserHobby = z.infer<typeof userHobbySchema>

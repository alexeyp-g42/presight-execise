/* The one place the avatar URL is spelled. Minted onto every user the list
   endpoint returns (#19) and served by a route that reads the id back out of
   the same path (#22) — so the field and the route cannot drift into disagreeing
   about where an avatar lives.

   Derived from the primary key rather than stored: a column would be 25,000 NOT
   NULL strings the seed writes and nobody reads. See `db/schema.ts`. */
export const avatarPath = (id: number): string => `/api/avatars/${id}.svg`

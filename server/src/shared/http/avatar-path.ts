/* The one place the avatar URL is spelled. Minted onto every user the list
   endpoint returns (#19) and served by a route that reads the id back out of
   the same path (#22) — so the field and the route cannot drift into disagreeing
   about where an avatar lives.

   Derived from the primary key rather than stored: a column would be 25,000 NOT
   NULL strings the seed writes and nobody reads. See `shared/db/schema.ts`.

   In `shared/` rather than in either feature, because it is the seam between
   them: `user` mints the path onto every row it returns, `avatar` answers the
   request that comes back. Under `feature/avatar/lib/` the minting would be a
   sibling import and fail lint — promotion is the rule's own answer to a module
   two features hold. */
export const avatarPath = (id: number): string => `/api/avatars/${id}.svg`

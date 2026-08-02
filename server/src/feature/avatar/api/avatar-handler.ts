import { Avatar, Style } from '@dicebear/core'
import lorelei from '@dicebear/styles/lorelei.json' with { type: 'json' }
import type { RequestHandler } from 'express'
import { ApiError } from '../../../shared/http/api-error.ts'

/* Avatars are drawn here, on demand, from the user id alone — see CONTEXT.md
   for what that rules out and why. Nothing below reads the database: the id is
   the seed, not a lookup key, so an id matching no row still draws and a
   request arriving before the seed script has run is answered anyway. */

/* Parsed once, at import: `new Style(definition)` does the work that does not
   depend on the seed, which is the difference between ~1.4ms and ~0.08ms per
   avatar. `lorelei` is the people-shaped style with the smaller document —
   ~5.7KB against `notionists`' ~13KB, on a payload the viewer downloads twenty
   of at a time. */
const style = new Style(lorelei)

/* An intrinsic size, so the card holds the avatar's space before it resolves
   rather than reflowing the list as each one lands. The document is vector —
   this fixes the aspect ratio, not the rendered resolution. */
const AVATAR_SIZE = 128

/* A year, and `immutable`: the avatar for an id is derived from the id, so it
   cannot change, and without `immutable` a reload turns a screen of cards into
   twenty revalidation requests. This is the only route that caches.

   Deliberately not memoised server-side. Holding all 25,000 documents would be
   ~140MB to save 0.08ms, and `immutable` means a viewer asks once. */
const CACHE_FOR_A_YEAR = 'public, max-age=31536000, immutable'

/* The shape of a user id, not a check that one exists — that would be the
   database query this route is defined by not making. Nineteen digits is what
   SQLite's INTEGER primary key can hold, so this rejects nothing the list
   endpoint can mint.

   It is a real bound rather than a formality: the generator refuses a seed over
   1024 characters, and a path segment is otherwise limited only by the request
   line, so without this a long enough URL is a 500. */
const DIGITS_ONLY = /^\d{1,19}$/

/* The one route under `/api` that does not answer in the error envelope: it
   returns SVG, not JSON. Only the success path is the exception — a path that
   names no avatar is a 404 in the same envelope as everywhere else. */
export const avatarHandler: RequestHandler<{ id: string }> = (req, res) => {
  const { id } = req.params

  if (!DIGITS_ONLY.test(id)) {
    throw new ApiError('NOT_FOUND', `No avatar is addressed by ${req.originalUrl}`)
  }

  /* The charset is explicit because the attribution metadata carries
     typographic quotes, and this document has no XML declaration for a client
     to fall back on. */
  res.type('image/svg+xml; charset=utf-8')
  res.set('Cache-Control', CACHE_FOR_A_YEAR)
  res.send(new Avatar(style, { seed: id, size: AVATAR_SIZE }).toString())
}

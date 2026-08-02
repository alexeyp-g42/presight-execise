import { existsSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import express, { type RequestHandler } from 'express'

/* The other half of "one image, one origin": the Node server hands back the
   built client from the same port it answers `/api` on. That is not a
   separation-of-concerns preference — Vite bakes `import.meta.env.VITE_*` at
   build time, so a second image would force either an API URL baked into the
   bundle (wrong the moment a port changes) or a reverse proxy in front of both.
   Serving from here makes the client's API base the literal string `/api` in
   every environment, with no CORS anywhere. */

/* `<package>/public` from both `src/shared/http` and the compiled
   `dist/shared/http`, so the dev loop and the runtime image resolve the same
   directory. Resolved from `import.meta.url` rather than the working directory,
   because the container runs `node dist/index.js` from wherever the entrypoint
   leaves it — which also means the number of `..` here is this file's depth in
   the tree, and moving it means counting again. */
export const CLIENT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'public')

/* Vite content-hashes everything it writes into `assets/`, so those files can
   never change under their own name — the same reasoning as the avatar route,
   and the same header. */
const CACHE_FOR_A_YEAR = 'public, max-age=31536000, immutable'

/* `index.html` is the one file Vite does not hash, and it is what names the
   current hashed bundle. Cached without revalidation it would keep pointing a
   returning viewer at a deleted bundle after a redeploy. */
const ALWAYS_REVALIDATE = 'no-cache'

const HASHED_ASSETS = `assets${sep}`

export const serveClient = (dir = CLIENT_DIR): RequestHandler => {
  const shell = join(dir, 'index.html')

  /* Checked once, at boot, rather than per request. Outside the image there is
     no `server/public` — the dev loop runs Vite on its own port and proxies
     `/api` here — so this handler has to be a no-op that leaves every path to
     the 404 envelope behind it, and `test/app.test.ts` asserts exactly that. */
  if (!existsSync(shell)) {
    return (_req, _res, next) => {
      next()
    }
  }

  const assets = express.static(dir, {
    setHeaders: (res, filePath) => {
      const isHashed = relative(dir, filePath).startsWith(HASHED_ASSETS)
      res.set('Cache-Control', isHashed ? CACHE_FOR_A_YEAR : ALWAYS_REVALIDATE)
    },
  })

  return (req, res, next) => {
    assets(req, res, (error?: unknown) => {
      if (error !== undefined) {
        next(error)
        return
      }

      /* Matched no file: hand back the shell so a deep link boots the client
         rather than 404ing, which is what makes the URL-synced view state
         shareable. Only for a fetch of a document — a POST that matched nothing
         is a genuine 404 and belongs in the error envelope. */
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next()
        return
      }

      res.set('Cache-Control', ALWAYS_REVALIDATE)
      res.sendFile(shell, (sendError?: unknown) => {
        if (sendError !== undefined) next(sendError)
      })
    })
  }
}

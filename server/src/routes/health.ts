import type { RequestHandler } from 'express'

export type HealthResponse = { status: 'ok' }

/* Liveness only, and deliberately so: it takes no database handle, so it cannot
   grow a query later without the signature changing in review. The container's
   healthcheck is this route — a database-touching version would report a
   healthy-but-unseeded container and a container with no database as the same
   thing, and the seed runs before the server, so on a first boot the tables do
   not exist yet while the process is perfectly alive. */
export const healthHandler: RequestHandler = (_req, res) => {
  res.json({ status: 'ok' } satisfies HealthResponse)
}

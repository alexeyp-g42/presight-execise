import { createApp } from './app.ts'
import { migrate } from './shared/db/migrate.ts'
import { openDb } from './shared/db/open-db.ts'

/* The bootstrap, and the only file that listens on a port. Everything it wires
   together is a plain function over its dependencies, which is what lets the
   suite exercise the whole app without any of this. */

const port = Number(process.env.PORT ?? 3000)
/* A garbage `PORT` is a failed boot, not a silent correction: `listen(NaN)`
   binds whatever the OS hands out, and the port the container publishes would
   then point at nothing while the log still says the server started. */
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`PORT must be an integer between 1 and 65535 — got '${process.env.PORT}'`)
  process.exit(1)
}

const db = openDb()
/* On boot, every boot. The container may be starting against a volume seeded
   weeks ago or against nothing at all, and it has no way to tell which — so the
   migration runs unconditionally and is a no-op when there is nothing to
   apply. */
migrate(db)

createApp(db).listen(port, () => {
  console.log(`server listening on http://localhost:${port}`)
})

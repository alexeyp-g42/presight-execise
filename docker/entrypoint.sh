#!/bin/sh
# The container's boot sequence, and the whole of the "first `up` seeds, second
# `up` is instant" behaviour. It is a shell script rather than a flag on the
# server for one reason: the decision has to be made *before anything opens the
# database*. `migrate()` runs on every boot and would create the file, so a
# check inside the Node process would seed once and never again.
set -eu

DB_PATH="${DATABASE_PATH:-/data/presight.sqlite}"
SEED_ON_BOOT="${SEED_ON_BOOT:-auto}"

# The named volume mounts as an empty directory, and WAL puts two sidecar files
# next to the database — which is why the volume covers the directory and this
# creates the directory, never the file. Creating the file here would be
# indistinguishable from a seeded database on the next boot.
mkdir -p "$(dirname "$DB_PATH")"

# A pinned path: `server/src/db/seed.ts` compiles to exactly this, and
# `test/db/seed-cli.test.ts` covers the process seam it presents. Moving the
# source file means editing this line.
seed() {
  echo "[entrypoint] seeding $DB_PATH"
  node dist/db/seed.js
  echo "[entrypoint] seed complete"
}

case "$SEED_ON_BOOT" in
  auto)
    if [ -f "$DB_PATH" ]; then
      echo "[entrypoint] database present at $DB_PATH; skipping seed"
    else
      echo "[entrypoint] no database at $DB_PATH"
      seed
    fi
    ;;
  force)
    # The sidecars go too. A WAL left beside a deleted database is a partial
    # dataset waiting to be replayed into the fresh one.
    echo "[entrypoint] SEED_ON_BOOT=force; dropping $DB_PATH"
    rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
    seed
    ;;
  never)
    echo "[entrypoint] SEED_ON_BOOT=never; skipping seed"
    ;;
  *)
    # The same rule PORT and SEED_USER_COUNT follow: garbage is a failed boot,
    # not a silent correction. Falling through to `auto` would mean a typo'd
    # `never` quietly seeds a volume the operator meant to protect.
    echo "[entrypoint] SEED_ON_BOOT must be auto, force or never — got '$SEED_ON_BOOT'" >&2
    exit 1
    ;;
esac

# `exec`, so node replaces this shell as PID 1 and receives SIGTERM directly —
# without it `docker compose down` waits out the 10s timeout on every stop.
exec "$@"

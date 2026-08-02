#!/bin/sh
set -e

# The database lives on a named volume, so seeding happens once on first boot
# and is skipped on every restart after that.
if [ ! -f "$DATABASE_PATH" ]; then
  echo "No database at $DATABASE_PATH — seeding ${SEED_USERS:-50000} users..."
  node server/dist/seed/seed.js --users="${SEED_USERS:-50000}"
else
  echo "Using existing database at $DATABASE_PATH"
fi

exec node server/dist/index.js

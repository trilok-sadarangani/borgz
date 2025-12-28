#!/bin/sh
set -e

echo "[backend] waiting for database (DATABASE_URL must be set)"

# Prisma will retry connections internally, but migrations can fail fast on DNS/connect issues.
# Keep a small retry loop to smooth out container startup ordering.
i=0

# Prefer migrations in production (Render). Allow overriding via PRISMA_SYNC_MODE=dbpush.
SYNC_MODE="${PRISMA_SYNC_MODE:-migrate}"

if [ "$SYNC_MODE" = "dbpush" ]; then
  CMD="npx prisma db push"
else
  CMD="npx prisma migrate deploy"
fi

until sh -c "$CMD" >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -ge 30 ]; then
    echo "[backend] prisma sync failed after ${i} attempts (mode=${SYNC_MODE})"
    sh -c "$CMD"
    exit 1
  fi
  echo "[backend] db not ready yet, retrying (${i}/30)..."
  sleep 2
done

echo "[backend] database schema is up to date"
exec node dist/backend/src/server.js



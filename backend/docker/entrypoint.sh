#!/bin/sh
set -e

echo "[backend] waiting for database (DATABASE_URL must be set)"

# Prisma will retry connections internally, but db push fails fast on DNS/connect issues.
# Keep a small retry loop to smooth out container startup ordering.
i=0
until npx prisma db push >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -ge 30 ]; then
    echo "[backend] prisma db push failed after ${i} attempts"
    npx prisma db push
    exit 1
  fi
  echo "[backend] db not ready yet, retrying (${i}/30)..."
  sleep 2
done

echo "[backend] database schema is up to date"
exec node dist/backend/src/server.js



#!/bin/sh
set -e

MIGRATIONS_DIR="/app/prisma/migrations"

echo "[entrypoint] Syncing database schema..."
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  # First attempt: migrate deploy (normal path)
  # If it fails because the DB was created by db push (no _prisma_migrations),
  # auto-resolve the baseline migration and retry — happens only once.
  if ! npx prisma migrate deploy; then
    echo "[entrypoint] Schema exists without migration history — resolving baseline..."
    BASELINE=$(ls "$MIGRATIONS_DIR" | grep -v migration_lock | sort | head -1)
    if [ -z "$BASELINE" ]; then
      echo "[entrypoint] ERROR: no baseline migration found"
      exit 1
    fi
    npx prisma migrate resolve --applied "$BASELINE"
    npx prisma migrate deploy
  fi
else
  echo "[entrypoint] No migrations found — running prisma db push (initial schema)"
  npx prisma db push --skip-generate
fi

echo "[entrypoint] Seeding initial data (idempotent)..."
node prisma/seed.js || echo "[entrypoint] Seed warning — check logs, non-critical"

echo "[entrypoint] Starting CobranzaPro backend..."
exec node dist/main

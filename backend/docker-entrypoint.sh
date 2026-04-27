#!/bin/sh
set -e

echo "[entrypoint] Syncing database schema..."
MIGRATIONS_DIR="/app/prisma/migrations"
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  echo "[entrypoint] Migrations found — running prisma migrate deploy"
  npx prisma migrate deploy
else
  echo "[entrypoint] No migrations found — running prisma db push (schema creation only)"
  npx prisma db push --skip-generate
fi

echo "[entrypoint] Starting CobranzaPro backend..."
exec node dist/main

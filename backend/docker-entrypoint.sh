#!/bin/sh
set -e

echo "[entrypoint] Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss

echo "[entrypoint] Starting CobranzaPro backend..."
exec node dist/main

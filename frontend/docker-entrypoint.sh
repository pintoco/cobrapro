#!/bin/sh
set -e

LISTEN_PORT="${PORT:-3000}"
echo "[frontend] Starting Next.js on 0.0.0.0:${LISTEN_PORT}..."
exec node_modules/.bin/next start -H 0.0.0.0 -p "$LISTEN_PORT"

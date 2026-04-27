# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL deps (devDeps needed to compile TS)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client for the target platform
RUN npx prisma generate

# Compile application
RUN npm run build

# Compile seed separately (ts-node not available in runner)
RUN npx tsc prisma/seed.ts \
    --target ES2019 --module commonjs --moduleResolution node \
    --esModuleInterop --skipLibCheck --outDir dist-seed

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# openssl required by Prisma on Alpine
RUN apk add --no-cache openssl

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Prisma client (pre-compiled for linux-musl-openssl-3.0.x)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Prisma schema + migrations (needed by migrate deploy)
COPY --from=builder /app/prisma ./prisma

# Compiled application
COPY --from=builder /app/dist ./dist

# Compiled seed (runs with plain node, no ts-node required)
COPY --from=builder /app/dist-seed/seed.js ./prisma/seed.js

# Entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]

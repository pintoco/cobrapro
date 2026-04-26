# CobranzaPro — CLAUDE.md

## Project overview

Multi-tenant SaaS for invoice management and debt collection. Each company (tenant) is fully isolated by `companyId` extracted from the JWT payload — **every database query must include a `companyId` filter**.

Stack: NestJS 10 (backend) + Next.js 14 App Router (frontend) + Prisma 5 + PostgreSQL 16.

---

## Repository layout

```
cobrapro/
├── backend/          NestJS API
├── frontend/         Next.js 14 frontend
├── docker-compose.yml
├── .env.example      Template — copy to .env for local Docker
└── .gitattributes    Forces LF line endings (eol=lf)
```

---

## Backend

### Commands

```bash
cd backend
npm run start:dev       # dev server with watch (port 3001)
npm run build           # compile TypeScript → dist/
npm run lint            # ESLint with auto-fix
npm run prisma:generate # regenerate Prisma client after schema changes
npm run prisma:migrate  # create + apply a new migration (dev only)
npm run prisma:seed     # seed the database (creates SUPER_ADMIN)
npm run prisma:studio   # open Prisma Studio at localhost:5555
```

### Architecture patterns

- **Multi-tenancy**: `companyId` is read from `req.user` (JWT payload). Never trust `companyId` from request body.
- **PrismaModule is `@Global()`**: inject `PrismaService` directly in any service without importing `PrismaModule` in that module.
- **Auth guards**: `JwtAuthGuard` is applied globally via `APP_GUARD`. Mark public routes with `@Public()`.
- **Role guard**: applied globally via `APP_GUARD`. Use `@Roles(Role.ADMIN_EMPRESA)` on controllers/handlers.
- **Tenant middleware**: extracts `X-Tenant-ID` header (for super-admin cross-tenant operations).
- **Cron tasks**: `InvoiceExpirationTask` marks overdue invoices daily. `CollectionAutomationTask` sends reminders.
- **Email**: `EmailService` uses Nodemailer with SMTP config. Templates live in `src/notifications/templates/`.
- **Config**: all env vars are accessed via `ConfigService` using dot-path keys (`jwt.secret`, `database.url`, etc.). See `src/config/configuration.ts`.
- **Global exception filter** and **response interceptor** are registered in `app.module.ts` via `APP_FILTER` / `APP_INTERCEPTOR`.

### Key modules

| Module | Description |
|--------|-------------|
| `auth` | JWT login, refresh token, register |
| `companies` | Tenant CRUD (SUPER_ADMIN only) |
| `users` | User CRUD scoped to company |
| `clients` | Client CRUD scoped to company |
| `invoices` | Invoice + line items CRUD, status transitions |
| `payments` | Payment registration, void |
| `notifications` | Manual + automated collection reminders |
| `dashboard` | KPI aggregations (summary, overdue, delinquent, monthly) |
| `health` | `GET /api/v1/health` — public, used by Railway healthcheck |
| `prisma` | `@Global()` PrismaService |

### Database

Prisma schema at `backend/prisma/schema.prisma`. Main models: `Company → User, Client → Invoice → InvoiceItem, Payment, Notification`.

**Production schema sync**: the Docker entrypoint runs `prisma db push --skip-generate --accept-data-loss` (no migration files in this repo — `db push` is used instead of `migrate deploy`).

**binaryTargets**: `schema.prisma` includes `["native", "linux-musl-openssl-3.0.x"]` — required for Alpine Linux + OpenSSL 3 in Docker.

### TypeScript build notes

- `tsconfig.json` sets `"rootDir": "./src"` — compiled output lands at `dist/main.js` (not `dist/src/main.js`).
- `tsconfig.build.json` excludes `prisma/` so `seed.ts` (outside `src/`) doesn't violate `rootDir`.

---

## Frontend

### Commands

```bash
cd frontend
npm run dev     # dev server at http://localhost:3000
npm run build   # production build (embeds NEXT_PUBLIC_API_URL at build time)
npm run lint    # Next.js ESLint
```

### Architecture patterns

- **Route groups**: `(auth)/login` and `(dashboard)/` — the dashboard layout wraps all protected pages.
  - `(dashboard)/page.tsx` maps to `/` (route group is transparent). Do **not** create `app/page.tsx` — it would shadow the dashboard page.
  - After login, navigate to `/` (not `/dashboard`). The sidebar Dashboard link is also `/`.
- **Auth state**: Zustand store (`src/store/auth.store.ts`) persisted to localStorage (only `user` + `isAuthenticated`). Tokens stored in cookies via `js-cookie`.
- **Auth guard in layout**: `(dashboard)/layout.tsx` checks for `accessToken` cookie + `isAuthenticated`. Redirects to `/login` if missing.
- **API client**: `src/lib/api.ts` — Axios instance with:
  - Request interceptor: attaches `Authorization: Bearer <token>` from cookie.
  - Response interceptor: on 401 → calls refresh endpoint → retries queued requests.
  - Named namespaces: `authApi`, `clientsApi`, `invoicesApi`, `paymentsApi`, `notificationsApi`, `dashboardApi`.
- **Data fetching**: TanStack Query v5 with `staleTime: 30_000`. After mutations, call `queryClient.invalidateQueries`.
- **Forms**: React Hook Form + Zod resolvers. Invoice form uses `useFieldArray` for dynamic line items and `useWatch` for real-time totals.
- **`NEXT_PUBLIC_API_URL`** is a **build-time** variable (Next.js embeds it in the bundle). Set it as a Docker `ARG` before `npm run build`.

### Key files

| File | Description |
|------|-------------|
| `src/lib/api.ts` | Axios instance + all API methods |
| `src/lib/utils.ts` | `formatCurrency`, `formatDate`, status config maps |
| `src/store/auth.store.ts` | Zustand auth store |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `src/app/globals.css` | Utility classes: `.card`, `.btn-primary`, `.input`, `.badge`, `.sidebar-link` |
| `docker-entrypoint.sh` | Starts `next start -H 0.0.0.0 -p $PORT` (Railway injects PORT) |

---

## Docker (local)

```bash
# copy env and start
cp .env.example .env   # fill in secrets
docker compose up --build

# backend:  http://localhost:3001
# frontend: http://localhost:3000
# postgres: localhost:5432
```

The backend entrypoint (`backend/docker-entrypoint.sh`) runs `prisma db push` before starting the server.

---

## Railway deployment

Each service has its own `railway.toml` (`builder = "DOCKERFILE"`).

1. Create a Railway project with two services: `backend` and `frontend`.
2. Attach a PostgreSQL plugin to `backend` — Railway injects `DATABASE_URL` automatically.
3. Set env vars for `backend`: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CORS_ORIGINS` (frontend URL), SMTP vars.
4. Set env var for `frontend`: `NEXT_PUBLIC_API_URL` (backend public URL) — set **before** the first deploy so it's embedded at build time.
5. Do **not** set `PORT` — Railway injects it automatically and the entrypoints consume it.
6. Backend healthcheck: `GET /api/v1/health`. Frontend healthcheck: `GET /login` (root `/` redirects, which Railway rejects).

### First user

After deploying, create the first admin user via the public register endpoint:

```bash
curl -X POST https://<backend-url>/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "Empresa",
    "email": "admin@empresa.com",
    "password": "SecurePass123!",
    "companyName": "Mi Empresa"
  }'
```

---

## Environment variables

See `.env.example` at project root for the full list with explanations.

---

## Conventions

- All API routes are prefixed `/api/v1`.
- DTOs use `class-validator` decorators; controller pipes use `ValidationPipe` with `whitelist: true`.
- Decimal amounts from Prisma must be converted with `Number(decimal)` before arithmetic.
- Never skip `--no-verify` on commits — there are no hooks, but the convention should stand.

# CobranzaPro — CLAUDE.md

## Project overview

SaaS multi-tenant de cobranza para **pymes chilenas**. Cada empresa (tenant) está aislada por `companyId` extraído del JWT payload — **toda consulta a la base de datos debe incluir filtro `companyId`**.

Stack: NestJS 10 (backend) + Next.js 14 App Router (frontend) + Prisma 5 + PostgreSQL 16.

### Versión 2.0 — Mejoras implementadas (8 fases backend + 6 fases frontend)
- **FASE 1**: Adaptación Chile — RUT, IVA 19%, moneda CLP, locale es-CL, tipoDocumento (FACTURA/BOLETA/NOTA_COBRO), folio
- **FASE 2**: Planes SaaS — `SubscriptionPlan` + `CompanySubscription`. Planes: Básico $9.990, Pro $19.990, Empresa $49.990. Límites enforced en crear usuarios, clientes y facturas
- **FASE 3**: Auditoría — `AuditLog` registra CREATE/UPDATE/DELETE/STATUS_CHANGE en clientes, facturas, pagos. Endpoint `GET /api/v1/audit-logs`
- **FASE 4**: Mejoras financieras — `CollectionNote` (notas internas por factura), `PaymentPromise` (fechaPromesaPago, estadoPromesa: PENDIENTE/CUMPLIDA/INCUMPLIDA). Endpoint `/collection-notes`
- **FASE 5**: Importación Excel — `GET /api/v1/import/templates/clients|invoices` + `POST /api/v1/import/clients|invoices` con dryRun. Solo en planes Pro/Empresa
- **FASE 6**: Arquitectura WhatsApp — `MessageTemplate`, `WhatsAppService` (stub), `NotificationChannel` enum EMAIL/WHATSAPP. Solo en plan Empresa. Preparado para Meta Cloud API, Twilio, 360dialog
- **FASE 7**: Panel Super Admin — `GET /api/v1/admin/metrics|companies|plans`. Frontend `/admin/metricas`, `/admin/empresas`, `/admin/planes`. Visible solo para rol SUPER_ADMIN
- **FASE 8**: Seguridad — `helmet` (HTTP headers), `ThrottlerModule` (100 req/60s por IP), CORS estricto con validación de origin
- **FRONTEND FASE 1–2**: `/facturas/[id]` — detalle completo con ítems, historial de pagos, modal de pago, notas de cobranza, promesa de pago
- **FRONTEND FASE 3**: `/importar` — importación Excel con dry-run preview, errores detallados y confirmación
- **FRONTEND FASE 4**: `/clientes/[id]` — detalle de cliente con facturas asociadas y resumen de deuda
- **FRONTEND FASE 5**: `/suscripcion` — gestión de plan/suscripción con comparación de planes
- **FRONTEND FASE 6**: `/auditoria` — log de auditoría paginado con filtros

### Bugs corregidos (últimas revisiones)
- **TransformInterceptor**: la condición `'data' in obj && 'message' in obj` causaba doble-envolvimiento en respuestas sin `message`. Corregido para distinguir respuestas paginadas (tienen `meta.totalPages`) de respuestas de objeto único.
- **Notificaciones**: el estado de paginación existía pero no tenía UI. Se agregaron controles de paginación.
- **Facturas detail**: `tipoDocumento` mostraba el enum crudo en vez de la etiqueta legible.
- **Dashboard**: números de factura vencida y nombres de clientes morosos no tenían link de navegación.
- **Facturas list**: ignoraba el query param `clientId` de la URL (rompía el link "Ver todas" desde detalle de cliente).

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

### Response envelope — CRITICAL PATTERN

All HTTP responses go through `TransformInterceptor` (`src/common/interceptors/transform.interceptor.ts`).

**Rule**: Every service method that returns a single object, array, or stats object MUST return `{ data: X }` (with no `message` key for reads, or with `message` for mutations). The interceptor then spreads it into `{ success: true, data: X, message?: '...' }`.

**Paginated responses** (`paginate()` return value has `meta.totalPages`) are kept wrapped as `{ success: true, data: PaginatedResult }` — the frontend accesses them via `r.data.data`.

**Frontend access pattern**:
```typescript
// Paginated list  →  r.data.data = PaginatedResult<T>
clientsApi.getAll(...).then((r) => r.data.data)   // → { data: T[], meta: {...} }

// Single object   →  r.data.data = T
clientsApi.getById(id).then((r) => r.data.data)   // → Client

// Paginated client list for a select  →  r.data.data.data = T[]
clientsApi.getAll({limit:200}).then((r) => r.data.data.data)
```

**Do NOT** return plain objects without wrapping in `{ data: X }` from services — the interceptor will re-wrap them differently.

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
| `payments` | Registro de pagos, anulación |
| `notifications` | Recordatorios manuales + automatizados (cron) |
| `dashboard` | KPIs, vencidas, morosos, gráfico mensual |
| `health` | `GET /api/v1/health` — público, usado por Railway |
| `prisma` | `@Global()` PrismaService |
| `audit` | `@Global()` AuditService + controller `GET /audit-logs` |
| `subscriptions` | `@Global()` SubscriptionsService + planes + límites |
| `collection-notes` | Notas internas de cobranza + promesas de pago |
| `import` | Importación Excel de clientes y facturas (exceljs + multer) |
| `whatsapp` | Arquitectura WhatsApp Business (stub, sin integración real) |
| `admin` | Panel SUPER_ADMIN — métricas, empresas, planes |

### Nuevas variables de entorno

No se requieren nuevas variables obligatorias. Las siguientes son opcionales:

| Variable | Descripción |
|----------|-------------|
| `WHATSAPP_API_TOKEN` | Token Meta Cloud API o Twilio (cuando se integre WhatsApp real) |
| `WHATSAPP_PHONE_NUMBER_ID` | ID de número de WhatsApp Business |

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
  - Named namespaces: `authApi`, `clientsApi`, `invoicesApi`, `paymentsApi`, `notificationsApi`, `dashboardApi`, `collectionNotesApi`, `subscriptionsApi`, `importApi` (FormData), `auditApi`, `adminApi`.
- **Data fetching**: TanStack Query v5 with `staleTime: 30_000`. After mutations, call `queryClient.invalidateQueries`.
- **Forms**: React Hook Form + Zod resolvers. Invoice form uses `useFieldArray` for dynamic line items and `useWatch` for real-time totals.
- **`NEXT_PUBLIC_API_URL`** is a **build-time** variable (Next.js embeds it in the bundle). Set it as a Docker `ARG` before `npm run build`.

### Key files

| File | Description |
|------|-------------|
| `src/lib/api.ts` | Axios instance + all API methods (11 namespaces) |
| `src/lib/utils.ts` | `formatCurrency` (CLP/es-CL), `formatDate`, `formatRut`, status config maps |
| `src/store/auth.store.ts` | Zustand auth store |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `src/app/globals.css` | Utility classes: `.card`, `.btn-primary`, `.input`, `.badge`, `.sidebar-link` |
| `src/components/layout/Sidebar.tsx` | Nav + admin section (visible solo SUPER_ADMIN) |
| `src/components/clientes/ClienteModal.tsx` | Form con campos chilenos (RUT, razón social, giro, comuna) |
| `src/components/facturas/FacturaModal.tsx` | Form con tipoDocumento, folio, ivaRate, totales CLP |
| `src/app/(dashboard)/facturas/[id]/page.tsx` | Detalle factura + modal pago + notas + promesa |
| `src/app/(dashboard)/clientes/[id]/page.tsx` | Detalle cliente + KPIs + lista facturas |
| `src/app/(dashboard)/importar/page.tsx` | Importación Excel (dry-run + confirmación) |
| `src/app/(dashboard)/suscripcion/page.tsx` | Plan actual + comparador de planes |
| `src/app/(dashboard)/auditoria/page.tsx` | Log de auditoría paginado |
| `src/app/(dashboard)/admin/metricas/page.tsx` | KPIs globales — SUPER_ADMIN |
| `src/app/(dashboard)/admin/empresas/page.tsx` | Gestión empresas — SUPER_ADMIN |
| `src/app/(dashboard)/admin/planes/page.tsx` | Planes y suscriptores — SUPER_ADMIN |
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

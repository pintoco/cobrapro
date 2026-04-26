# CobranzaPro

SaaS multi-tenant de cobranza para **pymes chilenas**: clientes, facturas con IVA 19%, pagos, recordatorios automáticos, panel de administración y planes de suscripción.

**Demo en producción:**
- Frontend: `https://frontend-production-a941.up.railway.app`
- Backend API: `https://backend-production-1a66.up.railway.app/api/v1/health`

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 10, TypeScript, Prisma 5, PostgreSQL 16 |
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Estado | Zustand + TanStack Query v5 |
| Formularios | React Hook Form + Zod |
| Gráficos | Recharts |
| Auth | JWT (access 15 min + refresh 7 días) |
| Email | Nodemailer / SMTP |
| Excel | ExcelJS (import/export) |
| Seguridad | Helmet + ThrottlerModule (100 req/60s) + CORS estricto |
| Deploy | Docker multi-stage + Railway |

---

## Versión 2.0 — Funcionalidades

### Core

- **Multi-tenancy**: cada empresa es un tenant aislado; todos los datos se filtran por `companyId`.
- **Roles**: `SUPER_ADMIN`, `ADMIN_EMPRESA`, `OPERADOR`, `CLIENTE`.
- **Clientes**: CRUD con estado (Activo / Inactivo / Bloqueado), búsqueda y paginación. Campos chilenos: RUT, razón social, giro, comuna, ciudad.
- **Facturas**: FACTURA / BOLETA / NOTA_COBRO / OTRO. Folio, IVA 19% configurable, cálculo neto → IVA → total en CLP. Líneas de detalle dinámicas.
- **Pagos**: registro de pagos (WebPay, transferencia electrónica, etc.), anulación, historial por factura.
- **Notificaciones**: recordatorios manuales y automatizados (cron), plantillas HTML por tipo.
- **Dashboard**: KPIs (total por cobrar, vencido, mora), gráfico de cobranza mensual, clientes morosos.

### Versión 2.0 — 8 fases

| Fase | Descripción |
|------|-------------|
| **FASE 1** | Adaptación Chile — RUT, IVA 19%, CLP, locale es-CL, tipoDocumento (FACTURA/BOLETA/NOTA_COBRO), folio |
| **FASE 2** | Planes SaaS — Básico $9.990 / Pro $19.990 / Empresa $49.990. Límites en usuarios, clientes y facturas |
| **FASE 3** | Auditoría — `AuditLog` registra CREATE/UPDATE/DELETE/STATUS_CHANGE en clientes, facturas y pagos |
| **FASE 4** | Mejoras financieras — `CollectionNote` (notas por factura), `PaymentPromise` (fechaPromesaPago, PENDIENTE/CUMPLIDA/INCUMPLIDA) |
| **FASE 5** | Importación Excel — templates descargables + carga masiva con validación dryRun. Solo planes Pro/Empresa |
| **FASE 6** | Arquitectura WhatsApp — `MessageTemplate`, `WhatsAppService` (stub). Preparado para Meta Cloud API / Twilio. Solo plan Empresa |
| **FASE 7** | Panel Super Admin — métricas globales, gestión de empresas y planes. Rol `SUPER_ADMIN` requerido |
| **FASE 8** | Seguridad — `helmet` (headers HTTP), rate limiting (100 req/60s por IP), CORS estricto con whitelist de origins |

---

## Estructura del repositorio

```
cobrapro/
├── backend/              NestJS API (puerto 3001)
│   ├── src/
│   │   ├── admin/            Panel Super Admin (métricas, empresas, planes)
│   │   ├── audit/            AuditLog @Global() — CREATE/UPDATE/DELETE/STATUS_CHANGE
│   │   ├── auth/             JWT login, refresh, register
│   │   ├── clients/          CRUD clientes + campos chilenos
│   │   ├── collection-notes/ Notas de cobranza + promesas de pago
│   │   ├── companies/        Tenants (solo SUPER_ADMIN)
│   │   ├── config/           ConfigService con dot-path keys
│   │   ├── dashboard/        KPIs, morosos, gráfico mensual
│   │   ├── health/           GET /api/v1/health (público)
│   │   ├── import/           Importación Excel clientes + facturas (ExcelJS + Multer)
│   │   ├── invoices/         Facturas chilenas (FACTURA/BOLETA/folio/IVA)
│   │   ├── notifications/    Recordatorios manuales + cron
│   │   ├── payments/         Pagos + anulación
│   │   ├── prisma/           @Global() PrismaService
│   │   ├── subscriptions/    Planes SaaS + validación de límites @Global()
│   │   ├── users/            CRUD usuarios por empresa
│   │   └── whatsapp/         Arquitectura WhatsApp Business (stub)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts           Crea SUPER_ADMIN + 3 planes de suscripción
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   └── railway.toml
├── frontend/             Next.js 14 (puerto 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   └── (dashboard)/          ← mapea a /
│   │   │       ├── page.tsx          Dashboard principal
│   │   │       ├── clientes/
│   │   │       ├── facturas/
│   │   │       ├── notificaciones/
│   │   │       ├── pagos/
│   │   │       └── admin/            Solo SUPER_ADMIN
│   │   │           ├── metricas/
│   │   │           ├── empresas/
│   │   │           └── planes/
│   │   ├── components/
│   │   ├── lib/                      api.ts, utils.ts (formatCurrency CLP, formatRut)
│   │   ├── store/                    Zustand auth store
│   │   └── types/
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   └── railway.toml
├── docker-compose.yml
├── .env.example
└── .gitattributes
```

---

## Inicio rápido (Docker)

### Requisitos

- Docker Desktop
- Node.js 20+ (solo para desarrollo local sin Docker)

### Pasos

```bash
# 1. Clonar
git clone https://github.com/pintoco/cobrapro.git
cd cobrapro

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env: contraseñas, JWT secrets, SMTP

# 3. Levantar servicios
docker compose up --build

# Backend:   http://localhost:3001
# Frontend:  http://localhost:3000
# API Docs:  http://localhost:3001/api/docs
```

El entrypoint del backend ejecuta `prisma db push` automáticamente al iniciar.

---

## Desarrollo local (sin Docker)

### Backend

```bash
cd backend
npm install

cp .env.example .env   # ajustar DATABASE_URL a PostgreSQL local

npm run prisma:generate
npm run prisma:migrate   # crea y aplica migraciones
npm run prisma:seed      # crea SUPER_ADMIN + planes de suscripción
npm run start:dev        # http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install

echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

npm run dev              # http://localhost:3000
```

---

## Variables de entorno

Ver [`.env.example`](.env.example) para la lista completa con descripciones.

### Backend (obligatorias para producción)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión PostgreSQL |
| `JWT_SECRET` | Secreto para access tokens (≥ 64 chars) |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens (≥ 64 chars, diferente al anterior) |
| `CORS_ORIGINS` | URL(s) del frontend separadas por coma |
| `SMTP_HOST` | Servidor SMTP para envío de correos |
| `SMTP_PORT` | Puerto SMTP |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP |

### Backend (opcionales)

| Variable | Descripción |
|----------|-------------|
| `WHATSAPP_API_TOKEN` | Token Meta Cloud API o Twilio (integración futura) |
| `WHATSAPP_PHONE_NUMBER_ID` | ID de número de WhatsApp Business |

### Frontend

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL pública del backend — se embebe en el bundle al hacer build |

---

## Planes de suscripción

| Plan | Precio | Usuarios | Clientes | Facturas/mes | Excel | WhatsApp |
|------|--------|----------|----------|--------------|-------|----------|
| Básico | $9.990 CLP/mes | 3 | 100 | 50 | ✗ | ✗ |
| Pro | $19.990 CLP/mes | 10 | 500 | 500 | ✓ | ✗ |
| Empresa | $49.990 CLP/mes | 50 | Ilimitado | Ilimitado | ✓ | ✓ |

Los planes se crean en la base de datos al ejecutar `npm run prisma:seed`.

---

## Despliegue en Railway

1. Crear proyecto Railway con dos servicios: **backend** y **frontend**.
2. Adjuntar plugin PostgreSQL al servicio `backend` — Railway inyecta `DATABASE_URL` automáticamente.
3. Configurar variables de entorno en cada servicio (ver tablas anteriores).
4. Configurar `NEXT_PUBLIC_API_URL` en el frontend **antes del primer deploy** (se embebe en el build).
5. **No configurar `PORT`** — Railway lo inyecta automáticamente.
6. Hacer deploy — cada servicio usa su propio `railway.toml` con `builder = "DOCKERFILE"`.

El healthcheck del backend apunta a `GET /api/v1/health`.
El healthcheck del frontend apunta a `GET /login` (la raíz `/` redirigiría, Railway requiere 2xx).

### Primer usuario y datos iniciales

```bash
# 1. Crear primer administrador
curl -X POST https://<backend-url>/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "Empresa",
    "email": "admin@empresa.com",
    "password": "SecurePass123!",
    "companyName": "Mi Empresa"
  }'

# 2. Crear planes de suscripción (desde consola del servicio en Railway)
npm run prisma:seed
```

---

## API

La documentación interactiva (Swagger) está disponible en `/api/docs` cuando `NODE_ENV != production`.

Todos los endpoints usan el prefijo `/api/v1`.

### Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registrar empresa + admin |
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/logout` | Cerrar sesión |
| GET/POST | `/clients` | Listar / crear clientes |
| GET/PUT/DELETE | `/clients/:id` | Obtener / actualizar / eliminar cliente |
| GET/POST | `/invoices` | Listar / crear facturas |
| PATCH | `/invoices/:id/status` | Cambiar estado de factura |
| GET/POST | `/payments` | Listar / registrar pagos |
| PATCH | `/payments/:id/void` | Anular pago |
| GET | `/dashboard/summary` | KPIs principales |
| GET | `/dashboard/monthly-collections` | Gráfico mensual |
| GET/POST | `/collection-notes` | Notas de cobranza por factura |
| GET/POST | `/collection-notes/promises` | Promesas de pago |
| GET | `/audit-logs` | Historial de auditoría |
| GET | `/subscriptions/plans` | Listar planes disponibles |
| GET | `/subscriptions/my` | Suscripción activa de la empresa |
| GET | `/import/templates/clients` | Descargar plantilla Excel clientes |
| GET | `/import/templates/invoices` | Descargar plantilla Excel facturas |
| POST | `/import/clients` | Importar clientes desde Excel |
| POST | `/import/invoices` | Importar facturas desde Excel |
| GET | `/admin/metrics` | Métricas globales (SUPER_ADMIN) |
| GET | `/admin/companies` | Listado de empresas (SUPER_ADMIN) |
| GET | `/admin/plans` | Planes con conteo de suscriptores (SUPER_ADMIN) |
| GET | `/health` | Health check (público) |

---

## Scripts útiles

```bash
# Generar secretos JWT
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Ver estado de la base de datos
cd backend && npm run prisma:studio

# Solo backend + postgres para desarrollo
docker compose up postgres backend

# Seed (planes de suscripción + SUPER_ADMIN)
cd backend && npm run prisma:seed
```

---

## Licencia

MIT

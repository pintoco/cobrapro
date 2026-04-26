# CobranzaPro

SaaS multi-tenant para gestión de cobranzas: clientes, facturas, pagos y recordatorios automáticos por correo.

**Demo en producción:**
- Frontend: `https://frontend-production-a941.up.railway.app`
- Backend: `https://backend-production-1a66.up.railway.app/api/v1/health`

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
| Deploy | Docker multi-stage + Railway |

---

## Funcionalidades

- **Multi-tenancy**: cada empresa es un tenant aislado; todos los datos se filtran por `companyId`.
- **Roles**: `SUPER_ADMIN`, `ADMIN_EMPRESA`, `OPERADOR`, `CLIENTE`.
- **Clientes**: CRUD con estado (Activo / Inactivo / Bloqueado), búsqueda y paginación.
- **Facturas**: líneas de detalle dinámicas, cálculo automático de subtotal + impuesto + descuento, transiciones de estado.
- **Pagos**: registro de pagos, anulación, historial por factura.
- **Notificaciones**: recordatorios manuales y automatizados (cron), plantillas HTML por tipo.
- **Dashboard**: KPIs (total por cobrar, vencido, mora), gráfico de cobranza mensual, clientes morosos.
- **Tarea programada**: marca facturas vencidas diariamente.

---

## Estructura del repositorio

```
cobrapro/
├── backend/              NestJS API (puerto 3001)
│   ├── src/
│   │   ├── auth/
│   │   ├── clients/
│   │   ├── companies/
│   │   ├── config/
│   │   ├── dashboard/
│   │   ├── health/
│   │   ├── invoices/
│   │   ├── notifications/
│   │   ├── payments/
│   │   ├── prisma/
│   │   └── users/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   └── railway.toml
├── frontend/             Next.js 14 (puerto 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   └── (dashboard)/     ← mapea a /
│   │   │       ├── clientes/
│   │   │       ├── facturas/
│   │   │       ├── notificaciones/
│   │   │       └── pagos/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── store/
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
# Editar .env: cambiar contraseñas, JWT secrets y SMTP

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

# Requiere PostgreSQL local o ajustar DATABASE_URL en backend/.env
cp .env.example .env

npm run prisma:generate
npm run prisma:migrate   # crea y aplica migraciones
npm run prisma:seed      # datos de prueba
npm run start:dev        # http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install

# frontend/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

npm run dev              # http://localhost:3000
```

---

## Variables de entorno

Ver [`.env.example`](.env.example) para la lista completa con descripciones.

Variables obligatorias para producción:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión PostgreSQL |
| `JWT_SECRET` | Secreto para access tokens (≥64 chars) |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens (≥64 chars, diferente) |
| `CORS_ORIGINS` | URLs del frontend (separadas por coma) |
| `SMTP_*` | Credenciales SMTP para envío de correos |
| `NEXT_PUBLIC_API_URL` | URL pública del backend (variable de build, embebida en el bundle) |

---

## Despliegue en Railway

1. Crear proyecto Railway con dos servicios: **backend** y **frontend**.
2. Adjuntar plugin PostgreSQL al servicio `backend` — Railway inyecta `DATABASE_URL` automáticamente.
3. Configurar variables de entorno en cada servicio (ver tabla anterior).
4. Configurar `NEXT_PUBLIC_API_URL` en el frontend **antes del primer deploy** (se embebe en el build).
5. **No configurar `PORT`** — Railway lo inyecta automáticamente.
6. Hacer deploy — cada servicio usa su propio `railway.toml` con `builder = "DOCKERFILE"`.

El healthcheck del backend apunta a `GET /api/v1/health`.
El healthcheck del frontend apunta a `GET /login` (la raíz `/` redirigiría, Railway requiere 2xx).

### Primer usuario

Después del deploy, crear el primer administrador vía el endpoint público de registro:

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

## API

La documentación interactiva (Swagger) está disponible en `/api/docs` cuando `NODE_ENV != production`.

Todos los endpoints usan el prefijo `/api/v1`.

### Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Registrar empresa + admin |
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/refresh` | Renovar access token |
| POST | `/api/v1/auth/logout` | Cerrar sesión |
| GET/POST | `/api/v1/clients` | Listar / crear clientes |
| GET/PUT/DELETE | `/api/v1/clients/:id` | Obtener / actualizar / eliminar cliente |
| GET/POST | `/api/v1/invoices` | Listar / crear facturas |
| PATCH | `/api/v1/invoices/:id/status` | Cambiar estado de factura |
| GET/POST | `/api/v1/payments` | Listar / registrar pagos |
| PATCH | `/api/v1/payments/:id/void` | Anular pago |
| GET | `/api/v1/dashboard/summary` | KPIs principales |
| GET | `/api/v1/dashboard/monthly-collections` | Gráfico mensual |
| GET | `/api/v1/health` | Health check (público) |

---

## Scripts útiles

```bash
# Generar secretos JWT
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Ver estado de la base de datos
cd backend && npm run prisma:studio

# Ejecutar solo el backend para desarrollo
docker compose up postgres backend
```

---

## Licencia

MIT

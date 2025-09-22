### TurboVets Secure Task Management System (Modular NX monorepo)

A role-based, auditable task management system built with NestJS (API) and Angular (Dashboard) in an Nx-powered monorepo. It implements JWT auth, RBAC policy guards, organization scoping, and comprehensive audit logging.

---

### Setup instructions

- Prerequisites
  - Node.js 20+
  - npm 9+

- Backend (API)
  1. From the monorepo root (`rbac-workspace/`), install dependencies:
     - `npm install`
  2. Create a `.env` file in `rbac-workspace/` or `rbac-workspace/api/` (both are supported by `ConfigModule`):
     ```env
     JWT_SECRET=dev_secret_change_me
     DB_PATH=rbac.sqlite
     PORT=3000
     # Set to true for first run to seed sample orgs/users/tasks
     SEED=true
     ```
  3. Start the API (Nx):
     - `npx nx serve api`
     - The server runs at `http://localhost:3000/api`
  4. Optional: run without Nx (manual build then run):
     - cd api && npx webpack-cli build --node-env=development & node dist/main.js
  5. Test API
     - `cd api` & `npm test`

- Frontend (Angular Dashboard)
  1. `cd dashboard`
  2. `npm install`
  3. `npm start` (Angular dev server at `http://localhost:4200`)
  4. Dashboard expects API at `http://localhost:3000/api` (see `src/environments/environment.ts`)

- First-run seeding
  - Seeding is triggered automatically on startup when `SEED=true` (see `AppService.onModuleInit`).
  - After the first run, set `SEED=false` to avoid reseeding on subsequent starts.

- Test accounts (seeded)
  - TurboVets AI Solutions
    - Owner: `ceo@turbovets.ai` / `owner123`
    - Admin: `cto@turbovets.ai` / `admin123`
    - Viewer: `developer@turbovets.ai` / `viewer123`
  - Additional organizations and users are seeded (VA Medical Center, VBA Regional Office, VetConnect). See server logs for full list.

---

### Architecture overview (Monorepo layout)

- Monorepo: Nx + npm workspaces
- High-level structure
  - `rbac-workspace/api` — NestJS REST API (TypeORM + SQLite, JWT auth, RBAC, audit)
  - `rbac-workspace/dashboard` — Angular 20+ dashboard (NgRx, Material)
  - `rbac-workspace/data` — Shared TypeScript DTOs and enums (e.g., `LoginDto`, `TaskDto`, `TaskStatus`)
  - `rbac-workspace/auth` — Shared auth types (e.g., `RbacUser`)
  - `rbac-workspace/api-e2e` — API E2E tests (Jest setup)

- Why Nx
  - Consistent tooling across backend and frontend with task graph and cached builds
  - Local libraries for DTOs/types reduce duplication and runtime drift
  - Scalable project structure for adding services/apps while sharing code

- Shared libraries/modules
  - `@rbac-workspace/data`: DTOs and enums used by API and Dashboard
    ```ts
    import { TaskStatus, TaskCategory } from '@rbac-workspace/data';
    import type { CreateTaskDto } from '@rbac-workspace/data';
    ```
  - `@rbac-workspace/auth`: shared `RbacUser` type for audit and guards
    ```ts
    import type { RbacUser } from '@rbac-workspace/auth';
    ```

- API bootstrap and globals
  - Global prefix: `api` (`main.ts`)
  - CORS enabled for `http://localhost:4200`
  - Global guards/interceptors:
    - `JwtAuthGuard` as `APP_GUARD` — enforces JWT on all routes except public auth/health
    - `AuditInterceptor` as `APP_INTERCEPTOR` — logs every request/response and errors

- Data layer
  - SQLite via TypeORM (auto sync dev): `User`, `Organization`, `Task`, `AuditLog`
  - Config via `.env` (supports root `.env` or `api/.env`)

---

### Data model explanation

- Entities (simplified)
  - `User`: `id`, `email`, `passwordHash`, `role` (owner|admin|viewer), `organizationId`, `firstName`, `lastName`, `title`
  - `Organization`: `id`, `name`, `description`
  - `Task`: `id`, `title`, `description?`, `status` (todo|doing|done), `category` (work|personal), `createdByUserId`, `organizationId`, timestamps
  - `AuditLog`: action/result, user/organization context, resource type/id, http info, details, duration, timestamp

- ERD
```
Organization (id, name)
   1 ────────* User (id, email, role, organizationId)
   1 ────────* Task (id, title, status, category, organizationId, createdByUserId)

User (id)
   1 ────────* Task (createdByUserId)

AuditLog (id, action, result, userId?, organizationId?, resourceType?, resourceId?, ...)
```

---

### Access control implementation

- Roles and organization hierarchy
  - Roles: `owner` > `admin` > `viewer`
  - All access is organization-scoped: users can only act within their `organizationId`

- Permissions (from `policy-helpers.ts`)
  - Read tasks: all authenticated roles within their org
  - Create tasks: `owner` and `admin`
  - Update tasks: `owner` and `admin`; `viewer` only if creator
  - Delete tasks: `owner` only

- JWT integration
  - `AuthController` issues JWT via `AuthService.login()` with payload `{ sub, email, role, orgId }`
  - `JwtStrategy` validates token and loads the `User` attached as `req.user`
  - `JwtAuthGuard` allows public routes under `/auth/*` and protects everything else

- Declarative policies
  - `@Policy()` with `PolicyGuard` evaluates predicates using `req.user` and optional resource extractors
  - Convenience decorators: `@AdminOnly()`, `@OwnerOnly()`, `@RequireRole([...])`

---

### API docs

- Base URL: `http://localhost:3000/api`

- Auth
  - `POST /auth/login` — login, returns `{ access_token, user }`
  - `GET /auth/test` — public health for auth routes

- Health and demos
  - `GET /` — API health (public)
  - `GET /protected` — requires JWT
  - `GET /admin-only` — admin/owner
  - `GET /owner-only` — owner
  - `GET /rbac-test` — returns current user context
  - `GET /task-read-demo`, `GET /task-create-demo`, `GET /audit-log-demo` — policy demos

- Tasks
  - `GET /tasks` — list with filters `status`, `category`, `createdByUserId`
  - `GET /tasks/stats` — aggregate stats (org-scoped)
  - `GET /tasks/my-tasks` — tasks created by current user
  - `GET /tasks/:id` — get by id
  - `POST /tasks` — create (admin/owner)
  - `PATCH /tasks/:id` — update (admin/owner; viewer if creator)
  - `DELETE /tasks/:id` — delete (owner)

- Audit
  - `GET /audit/logs` — list with filters/action/result/limits
  - `GET /audit/summary` — summary metrics
  - `GET /audit/stats` — detailed stats
  - `GET /audit/recent` — recent activity
  - `GET /audit/health` — audit health

- Samples
  - Login
    ```bash
    curl -X POST http://localhost:3000/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"ceo@turbovets.ai","password":"owner123"}'
    ```
  - List tasks
    ```bash
    curl -H "Authorization: Bearer <jwt>" \
      'http://localhost:3000/api/tasks?status=todo&category=work'
    ```
  - Task stats
    ```bash
    curl -H "Authorization: Bearer <jwt>" http://localhost:3000/api/tasks/stats
    ```
  - Audit logs
    ```bash
    curl -H 'Authorization: Bearer <jwt>' \
      'http://localhost:3000/api/audit/logs?action=task_created&result=success&limit=10'
    ```

---

### Notes on potential future enhancements

- Advanced role delegation
  - Org-scoped custom roles and per-resource delegation (task-level maintainers)
  - Temporal roles (time-bound access) and just-in-time elevation with audit

- Production-ready security
  - JWT refresh tokens with rotation and revocation lists (per device)
  - `helmet`, rate limiting, strict CORS, IP allow/deny lists
  - CSRF protection (if using cookies); sameSite/secure flags; session hardening
  - Secrets via vault/KMS; field-level encryption for sensitive data

- RBAC performance & caching
  - Cache policy results (short TTL) and commonly used scopes (Redis)
  - Preload resources for policy evaluation (DataLoader/unit-of-work)
  - Compile policies to decision graphs for O(1) checks (e.g., CASL/Oso-like)

- Data & scalability
  - PostgreSQL + migrations; read replicas; partitioned audit table with retention
  - Async, batched audit ingestion; backpressure and reliability policies

- Observability & DX
  - Structured logs, request IDs, metrics, traces (OpenTelemetry)
  - Swagger/OpenAPI + typed clients for Angular; CI/CD with Nx cache and affected builds

---

### Quick reference

- API base: `http://localhost:3000/api`
- Dashboard: `http://localhost:4200`
- Env: `.env` at repo root or `api/.env`
- DB: SQLite file at `DB_PATH` (default `rbac.sqlite`)

If anything is unclear or you want Swagger/OpenAPI added, say the word and I’ll wire it up.

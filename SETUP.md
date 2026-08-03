# Campus Ride — Setup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| Docker Desktop | latest | https://docker.com |
| Git | any | https://git-scm.com |

You also need a free **Supabase** account: https://supabase.com

---

## 1. Clone the repo

```bash
git clone <your-repo-url> campus-ride
cd campus-ride
```

---

## 2. Create a Supabase project

1. Go to https://supabase.com → **New project**
2. Choose a name (e.g. `campus-ride`), set a strong database password, pick a region
3. Wait ~2 minutes for provisioning

Collect the following from **Project Settings → API**:
- `SUPABASE_URL` — looks like `https://xxxx.supabase.co`
- `SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — secret service role key (**keep this private**)
- `SUPABASE_JWT_SECRET` — under **Project Settings → API → JWT Settings**

Collect the database URL from **Project Settings → Database → Connection string (URI)**:
- Use the **direct** connection string for migrations
- Format: `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`

---

## 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Open `backend/.env` and fill in all values from the previous step:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
APP_URL=http://localhost:5173
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Campus Ride <no-reply@campusride.local>
```

Frontend values can be edited in `frontend/.env` (for example `VITE_API_URL`).
Redis, port, `APP_URL`, and CORS values in `backend/.env` are pre-filled for local development.

### Supabase Auth email confirmation

Configure these once in the Supabase dashboard:

1. **Authentication → Providers → Email**
   - enable **Confirm email**
2. **Authentication → URL Configuration**
   - set `Site URL` to `http://localhost:5173`
   - add `http://localhost:5173/auth/confirm` to additional redirect URLs
3. **Authentication → SMTP Settings**
   - enable custom SMTP and paste the Mailtrap sandbox values from `backend/.env`
4. **Authentication → Email Templates → Confirm signup**
   - point the link to your app route using the token hash, for example:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm your signup
</a>
```

---

## 4. Start all services

```bash
docker-compose up --build
```

This starts:
| Service | URL | Description |
|---------|-----|-------------|
| frontend | http://localhost:5173 | React + Vite dev server |
| backend | http://localhost:8000 | Express API + Socket.io |
| email-worker | — | BullMQ worker (logs to console) |
| redis | localhost:6379 | Job queue + cache |

Wait for all four services to print their ready messages before continuing.

---

## 5. Run database migrations

Open a second terminal:

```bash
docker-compose exec backend npx prisma migrate dev --name init
```

This creates all tables in your Supabase PostgreSQL database.

---

## 6. Seed demo data

```bash
docker-compose exec backend npx prisma db seed
```

This creates:
- 1 admin user (`admin@campus-ride.app`)
- 3 passengers and 2 drivers (one approved, one pending)
- 2 vehicles, 3 rides, 4 bookings in various states
- Sample reviews and email-job log entries

---

## 7. Verify everything works

```bash
# Health check
curl http://localhost:8000/healthz
# → {"status":"ok"}

# Open the app
open http://localhost:5173
```

---

## Running tests

```bash
# Backend unit tests only (default fast path)
docker-compose exec backend npm test

# Explicit backend unit profile
docker-compose exec backend npm run test:unit

# Backend unit quality gate
docker-compose exec backend npm run test:unit:gate

# Explicit backend integration profile
docker-compose exec backend npm run test:integration

# Backend integration quality gate
docker-compose exec backend npm run test:integration:gate

# Full backend sweep
docker-compose exec backend npm run test:all

# Type-check the frontend
docker-compose exec frontend npm run type-check

# Or run backend tests locally without Docker
cd backend && npm ci && npx prisma generate && npm test
```

### Backend test profiles

- `npm test`
  Runs only the fast `*.unit.test.ts` suite. No database, Supabase, Redis, filesystem, or outbound HTTP access is allowed.
- `npm run test:unit:gate`
  Runs the unit suite with coverage and enforces stronger thresholds on the targeted business-logic modules instead of applying one blunt repo-wide minimum.
- `npm run test:integration`
  Runs `*.integration.test.ts` with `RUN_LIVE_INTEGRATION_TESTS=true` automatically enabled.
  Auth-backed API flows remain separately gated behind `RUN_AUTH_INTEGRATION_TESTS=true`.
- `npm run test:integration:gate`
  Runs the integration suite and then verifies that the critical infra/auth flow test files still exist and that auth-backed flows remain explicitly gated.
- `npm run test:all`
  Runs the full backend Vitest config, including unit, integration, and any remaining legacy `*.test.ts` files during migration.

### Integration test prerequisites

`npm run test:integration` is expected to run against real infrastructure for the DB/auth integration flows.

Required environment variables:

```bash
DATABASE_URL=postgresql://...
# or TEST_DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RUN_AUTH_INTEGRATION_TESTS=true   # only when running the auth-backed API subset
```

Required services:

- PostgreSQL reachable at `DATABASE_URL` or `TEST_DATABASE_URL`
- For auth-backed API integration: a Supabase project with Auth enabled and reachable through the configured `SUPABASE_*` values

Notes:

- Redis is not required for the Vitest integration profile because the BullMQ email queue is disabled in test mode.
- CI currently runs the infra-backed integration subset with PostgreSQL provisioned, while auth-backed API integration remains gated until the workflow provisions a real Supabase/Auth environment.
- Before running the integration profile against a fresh database, apply migrations:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run test:integration
```

---

## Useful commands

```bash
# Tail all logs
docker-compose logs -f

# Tail a single service
docker-compose logs -f backend

# Restart a single service
docker-compose restart backend

# Open a Prisma Studio UI
docker-compose exec backend npx prisma studio

# Generate Prisma client after schema changes
docker-compose exec backend npx prisma generate

# Create a new migration
docker-compose exec backend npx prisma migrate dev --name <migration-name>

# Stop everything
docker-compose down

# Stop and wipe all volumes (full reset)
docker-compose down -v
```

---

## Project structure

```
campus-ride/
├── backend/              — Express API, Prisma, Socket.io
│   ├── src/
│   │   ├── admin/        — Track D: admin dashboard & notifications
│   │   ├── bookings/     — Track C: bookings & payments
│   │   ├── rides/        — Track B: ride posting & search
│   │   ├── users/        — Track A: auth & profiles
│   │   ├── lib/          — Prisma, Redis, Supabase singletons
│   │   └── middleware/   — auth guard, error handler
│   └── prisma/           — schema.prisma + seed.ts
├── email-worker/         — BullMQ consumer (stub → plug in Nodemailer/Resend)
├── frontend/             — React 18 + Vite + Tailwind + Leaflet
│   └── src/
│       ├── features/     — feature-sliced pages (auth, rides, bookings, admin)
│       ├── components/   — shared UI (MapView, Navbar, ProtectedRoute)
│       ├── api/          — Axios base client
│       └── hooks/        — shared React hooks
├── .github/workflows/    — GitHub Actions CI
├── docker-compose.yml
├── backend/.env.example
└── frontend/.env.example
```

---

## Demo credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@campus-ride.app | SeedAdmin123! |
| Driver (approved) | dave@university.edu | SeedPass123! |
| Driver (pending) | eve@university.edu | SeedPass123! |
| Passenger | alice@university.edu | SeedPass123! |
| Passenger | bob@university.edu | SeedPass123! |
| Passenger | carol@university.edu | SeedPass123! |

> These are created in the Prisma DB only. To log in via the app you also need to create
> matching Supabase Auth users — see `backend/prisma/seed.ts` for the commented-out
> `supabaseAdmin.auth.createUser(...)` block.

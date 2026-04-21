# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Campus Ride is a university ride-sharing platform (DAT240 final project). Drivers post rides, passengers search/book them, admins manage the platform.

## Commands

### Backend (`/backend`)

```bash
npm run dev          # Dev server with hot reload (tsx watch)
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled production build
npm test             # Run Vitest unit tests
npm run test:watch   # Tests in watch mode
npm run db:generate  # Generate Prisma Client (required once per session)
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed demo data
```

`db:generate` requires `DATABASE_URL` to be set; in CI a dummy value works (`postgresql://x@localhost/x`).

### Frontend (`/frontend`)

```bash
npm run dev          # Vite dev server on 0.0.0.0:5173
npm run build        # TypeScript check + Vite production build
npm run type-check   # tsc --noEmit (also aliased as lint)
npm run preview      # Preview production build locally
```

### Docker (from repo root)

```bash
docker-compose up --build        # Start backend + frontend
docker-compose down              # Stop services
docker-compose down -v           # Full reset including volumes
docker-compose exec backend npm test  # Run tests inside container
```

## Architecture

### Service Layout

- **backend/** — Express 4 + Prisma ORM (port 8000)
- **frontend/** — React 18 + Vite + TanStack Query + Leaflet (port 5173)

Frontend proxies API calls to the backend in dev (configured in `vite.config.ts`).

> Redis, BullMQ, Socket.io, and the email-worker service have been removed and will be added back later.

### Backend Structure

Each feature follows a **Router → Controller → Schema** pattern:

- `src/users/` — auth, profiles, driver applications (Track A)
- `src/rides/` — ride posting and search (Track B)
- `src/bookings/` — booking lifecycle and payments (Track C)
- `src/admin/` — dashboard, reports, config management (Track D)
- `src/middleware/auth.ts` — `requireAuth` and `requireRole` middleware (JWT via Supabase)
- `src/middleware/errorHandler.ts` — global error handler; use the `AppError` class for structured errors
- `src/lib/prisma.ts` — Prisma singleton
- `src/lib/supabase.ts` — Supabase Admin client singleton

### Database (Prisma + Supabase/PostgreSQL)

Key models: `User`, `Vehicle`, `Ride`, `Booking`, `Review`, `Report`, `EmailJob`, `Config`.

- Run `npm run db:generate` after any schema change before building or testing
- Enums: `Role` (PASSENGER | DRIVER | ADMIN), `RideStatus`, `BookingStatus`

### Auth Flow

- Supabase Auth issues JWTs; backend verifies using `SUPABASE_JWT_SECRET`
- Frontend stores `access_token`/`refresh_token` in localStorage
- Axios interceptor in `src/api/client.ts` auto-attaches `Authorization: Bearer` headers and handles global 401 → redirect to `/login`

### Frontend Structure

- `src/features/` — page-level components organized by domain (auth, rides, bookings, profile, admin)
- `src/components/` — shared UI (Navbar, MapView, ProtectedRoute)
- `src/api/client.ts` — Axios instance with interceptors
- Styling: Tailwind CSS with shadcn/ui design tokens (CSS variables in `index.css`), class-variance-authority for variants

### Testing

- Vitest; primary test targets are Zod schema validations in each feature's `*.test.ts`
- CI (`.github/workflows/ci.yml`) runs backend type-check + tests and frontend type-check on every push/PR to `main`
- `prisma generate` runs in CI without a real DB connection (schema only)

## User Flows (frontend → backend)

### Auth

- **Register**: `POST /api/auth/register` → store `access_token`/`refresh_token` in `localStorage` → app routes to protected pages.
- **Login**: `POST /api/auth/login` → store tokens → `useAuth()` fetches `GET /api/users/me` to hydrate session.
- **Auth guard**: `ProtectedRoute` checks `useAuth()`; unauthenticated users are redirected to `/login`.

### Rides (Passenger + Driver)

- **Browse rides**: `/rides` page loads `GET /api/rides` and individual ride details via `GET /api/rides/:id`.
- **Driver posts ride**: `/rides/post` → `POST /api/rides`.
- **Driver manages rides**: `GET /api/rides/mine`, `PATCH /api/rides/:id/status`, `DELETE /api/rides/:id`.

### Bookings

- **Create booking**: `POST /api/bookings` (auth required).
- **View bookings**: `GET /api/bookings` and `GET /api/bookings/:id`.
- **Driver decisions**: `PATCH /api/bookings/:id/confirm` or `PATCH /api/bookings/:id/decline`.
- **Cancel**: `PATCH /api/bookings/:id/cancel`.
- **Reviews**: `POST /api/bookings/:id/review`.

### Profile & Driver Applications

- **Profile view/update**: `GET /api/users/me`, `PATCH /api/users/me`.
- **Apply as driver**: `POST /api/users/me/driver`.
- **Driver reviews** (public): `GET /api/users/:id/reviews`.

### Admin

- **Dashboard**: `/admin` → `GET /api/admin/stats`.
- **Driver approvals**: `GET /api/admin/drivers/pending`, `PATCH /api/admin/drivers/:id/decision`.
- **Reports**: users file via `POST /api/admin/reports`; admins view/resolve via `GET /api/admin/reports`, `PATCH /api/admin/reports/:id`.
- **Config**: public `GET /api/admin/config`, admin `PATCH /api/admin/config`.

## Environment Variables

**Backend** (`.env`): `DATABASE_URL`, `PORT` (8000), `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `NODE_ENV`

**Frontend** (`.env`): `VITE_API_URL` (http://localhost:8000), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Current Status

Most controller handlers are stubbed with TODOs — the schema/routing layer is complete but business logic integration is in progress. Stripe payment and PostGIS distance queries are planned for later sprints. Notification hooks in controllers are marked `// TODO: add notifications later` pending the re-addition of Socket.io.

## File Structure (current)

```
project/
	.claude/
	.github/
	.gitignore
	CLAUDE.md
	README.md
	SETUP.md
	backend/
		.env
		Dockerfile
		dist/
		package.json
		prisma/
			schema.prisma
			seed.ts
			migrations/
				migration_lock.toml
				20260419161625_init/
					migration.sql
		prisma.config.ts
		src/
			admin/
				controller.ts
				router.ts
				schemas.ts
				admin.test.ts
			bookings/
				controller.ts
				router.ts
				schemas.ts
				bookings.test.ts
			config/
				redis.ts
			lib/
				emailQueue.ts
				notify.ts
				prisma.ts
				socket.ts
				socket.types.ts
				supabase.ts
			middleware/
				auth.ts
				error.ts
			rides/
				controller.ts
				router.ts
				schemas.ts
				rides.test.ts
			users/
				authController.ts
				router.ts
				schemas.ts
				userController.ts
				users.test.ts
			workers/
				emailWorkers.ts
			index.ts
		tsconfig.json
		vitest.config.ts
	campus_ride.md
	docker-compose.yml
	frontend/
		.env
		Dockerfile
		components.json
		index.html
		nginx.conf
		package.json
		postcss.config.js
		public/
		src/
			api/
				client.ts
			components/
				MapView.tsx
				Navbar.tsx
				ProtectedRoute.tsx
			features/
				admin/
					AdminDashboard.tsx
				auth/
					LoginPage.tsx
					RegisterPage.tsx
				bookings/
					BookingsPage.tsx
				profile/
					ProfilePage.tsx
				rides/
					PostRidePage.tsx
					RidesPage.tsx
			hooks/
				useAuth.ts
			lib/
				utils.ts
			App.tsx
			index.css
			main.tsx
		tailwind.config.ts
		tsconfig.app.json
		tsconfig.json
		tsconfig.node.json
		vite.config.ts
	node_modules/
	package.json
```

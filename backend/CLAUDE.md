# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # tsx watch src/index.ts (hot reload)
npm run build        # tsc → dist/
npm start            # node dist/index.js
npm test             # unit suite only (default fast path)
npm run test:watch   # unit suite in watch mode
npm run test:unit    # fast isolated unit suite (no services/env required)
npm run test:unit:gate  # unit suite + business-logic coverage thresholds
npm run test:integration  # integration suite (requires DB + Supabase env)
npm run test:integration:gate  # integration suite + critical flow presence gate
npm run test:all     # unit + integration + legacy files
npm run db:generate  # generate Prisma Client (run after any schema change)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # tsx prisma/seed.ts
```

**Run a single test file:**
```bash
npx vitest run src/admin/admin.unit.test.ts
```

`db:generate` requires `DATABASE_URL`; CI uses a dummy value (`postgresql://x@localhost/x`).

## App vs Index split

`src/app.ts` owns Express setup and all route mounting. `src/index.ts` creates the HTTP server, calls `initSocket`, and conditionally loads `./workers/emailWorkers`. Tests import `./app` directly — the email worker and Socket.io are skipped when `process.env.VITEST === "true"`.

Mounted routes (all in `app.ts`):
- `POST /api/auth/*`, `GET|PATCH /api/users/*`
- `GET|POST|PATCH|DELETE /api/rides/*`
- `GET|POST|PATCH /api/bookings/*`
- `GET|POST|PATCH /api/admin/*`

> **Note:** `src/reports/` has its own router/controller that is **not mounted** in `app.ts`. The working reports endpoint is `POST /api/admin/reports` (inside `adminRouter`), handled by `admin/controller.ts::createReport`.

## Auth middleware

`requireAuth` (in `src/middleware/auth.ts`) does two sequential checks:
1. Validates the Bearer JWT via `supabaseAdmin.auth.getUser(token)`
2. Fetches the user's `role` from Prisma to populate `req.user = { id, role }`

Use `requireRole(...roles)` **after** `requireAuth` in the chain — it reads from `req.user.role`.

## Error handling

Throw `AppError(code, message, statusCode)` from any controller. The global `errorHandler` in `src/middleware/error.ts` automatically handles:
- `ZodError` → 422 with `fieldErrors`
- `AppError` → status from constructor
- Prisma `P2002` (unique violation) → 409
- Prisma `P2025` (record not found) → 404
- Prisma `P2034` (transaction conflict) → 409

Controllers should parse request bodies via their Zod schema first — thrown `ZodError` is caught globally, no manual try/catch for validation needed (though controllers still use try/catch to call `next(err)`).

## Feature module pattern

Each domain follows **Router → Controller → Schema**:

```
src/<feature>/
  router.ts      # Express Router; applies auth middleware per-route
  controller.ts  # async handlers; always pass errors to next(err)
  schemas.ts     # Zod schemas + inferred TypeScript types
  *.unit.test.ts         # preferred for business logic tests
  *.integration.test.ts  # preferred for supertest / DB / side-effect flows
  *.test.ts              # legacy tests kept runnable during migration
```

Zod schema types are exported as `z.infer<typeof SchemaName>` and used in controller function signatures.

### Unit-test harness

- `vitest.unit.config.ts` is the fast isolated harness for `*.unit.test.ts`
- It blocks live Prisma, Supabase, Redis, filesystem, and outbound HTTP/network access
- It also bans `supertest` in the unit suite; HTTP/app flow coverage belongs in `*.integration.test.ts`
- Use deterministic builders from `src/test/unit/builders.ts`
- Mock only boundaries such as repository modules and notifier/email ports; do not mock internal business logic inside the unit under test
- `npm run test:unit:gate` enforces stronger coverage only on the targeted business-logic files:
  `rides/matching.ts`, `rides/recurrence.ts`, `rides/serialize.ts`, `rides/location.ts`,
  `payments/service.ts`, `users/schemas.ts`, `bookings/schemas.ts`, and `admin/schemas.ts`

### Integration profile

- `vitest.integration.config.ts` is the explicit infra profile for `*.integration.test.ts`
- `src/test/integration/setup.ts` automatically sets `RUN_LIVE_INTEGRATION_TESTS=true`
- `src/test/integration/gates.ts` separates infra-backed integration from auth-backed integration
- `npm run test:integration:gate` verifies the critical integration test files exist and that auth-backed flows stay explicitly gated with `describeAuthIntegration(...)`
- `npm run test:integration` fails fast unless these env vars are present:
  - `DATABASE_URL` or `TEST_DATABASE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Required services for the infra-backed integration subset:
  - PostgreSQL reachable at the configured database URL
- Auth-backed API flows are gated separately behind `RUN_AUTH_INTEGRATION_TESTS=true`
- Required services for the auth-backed subset:
  - PostgreSQL reachable at the configured database URL
  - Supabase Auth reachable at the configured `SUPABASE_*` endpoints
- Redis is not required for the test profile because the email queue is disabled under Vitest

## Database notes

- `DriverProfile` stores `vehicleInfo` as `Json` (typed as `VehicleInfo` in the controller layer)
- `platformFee` = 10% of `totalFare`; `driverEarnings` = 90% — calculated at booking creation
- `Report.status` is a plain `String` (`"OPEN" | "RESOLVED" | "DISMISSED"`), not an enum in Prisma
- Stripe fields (`stripePaymentIntentId`, `paymentStatus`) on `Booking` are reserved for Sprint 3
- `Config` table is a key-value store; `getConfig` and `updateConfig` endpoints are stubbed with TODOs
- Run `npm run db:generate` before `npm test` or `npm run build` after any schema edit

## File uploads

`src/middleware/upload.ts` exports a Multer instance configured with `memoryStorage()`. Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`. Use as route-level middleware: `upload.single('field')` or `upload.array('field')`. File is available on `req.file` / `req.files`.

## Supabase integration

`src/lib/supabase.ts` exports `supabaseAdmin` (service-role client). It also exports `createSignedLicenseUrl(path)` for generating short-lived signed URLs to licence documents stored in Supabase Storage — used in `admin/controller.ts::listPendingDrivers`.

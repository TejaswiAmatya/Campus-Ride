# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # tsx watch src/index.ts (hot reload)
npm run build        # tsc → dist/
npm start            # node dist/index.js
npm test             # vitest run (all *.test.ts files)
npm run test:watch   # vitest interactive mode
npm run db:generate  # generate Prisma Client (run after any schema change)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # tsx prisma/seed.ts
```

**Run a single test file:**
```bash
npx vitest run src/admin/admin.test.ts
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
  *.test.ts      # unit tests (mock Prisma/Supabase)
  *.integration.test.ts  # supertest integration tests (import app directly)
```

Zod schema types are exported as `z.infer<typeof SchemaName>` and used in controller function signatures.

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

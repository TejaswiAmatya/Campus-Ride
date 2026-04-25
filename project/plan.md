  # plan.md — Campus Ride Remaining Work Plan

  ## Summary

  Use one short shared foundation pass before parallel work, then execute 4 tracks in parallel. The
  foundation pass exists only to avoid merge conflicts in backend/prisma/schema.prisma and to lock the new
  API contracts.

  Shared foundation pass:

  1. Land one consolidated Prisma migration for all new data needed by the remaining scope. Files:
     backend/prisma/schema.prisma, new migration under backend/prisma/migrations/
     *_remaining_scope_foundation/migration.sql.
  2. Add these schema contracts in that migration: User.accountStatus + suspendedUntil,
     DriverProfile.cancellationStrikes, RideStop, RideSeries, ride route/recurrence/preference fields,
     booking pickup/drop-off/message/payment/refund/check-in fields, PaymentStatus enum, ModerationAction.
  3. After that migration is merged, all track branches rebase once and avoid further schema edits unless
     absolutely necessary.

  Public API and type changes to lock up front:

  - POST /api/bookings accepts pickup, dropoff, and optional messageToDriver; booking creation runs
    simulated payment and returns payment/refund fields.
  - GET /api/bookings adds an upcoming=true filter; PATCH /api/bookings/:id/cancel applies the 2-hour
    refund policy; add PATCH /api/bookings/:id/picked-up and PATCH /api/bookings/:id/no-show.
  - Add PATCH /api/rides/:id for editing upcoming rides, PATCH /api/rides/:id/start, and extend ride
    search to accept pickup/drop-off, time-window, price, and preference filters.
  - Add GET /api/admin/reports/:id and POST /api/admin/users/:id/moderation-actions; extend report
    resolution to persist a note.

  ## Track A — Users & Auth (Person 1)

  1. Enforce user moderation state in auth and session hydration. Files: backend/src/middleware/auth.ts,
     backend/src/users/userController.ts, backend/src/users/schemas.ts, frontend/src/hooks/useAuth.ts,
     frontend/src/store/authStore.ts, frontend/src/features/auth/LoginPage.tsx.
  2. Expose account state in /api/users/me and profile data so suspended/banned users get a clear client-
     side state instead of generic failures. Files: backend/src/users/userController.ts, frontend/src/
     hooks/useProfile.ts, frontend/src/features/user/ProfilePage.tsx, new frontend/src/components/
     AccountStatusBanner.tsx.
  3. Surface cancellation/reliability and moderation summary on user-facing profile data where needed for
     trust indicators. Files: backend/src/users/userController.ts, frontend/src/components/
     PublicProfilePage.tsx, frontend/src/components/UserProfileCard.tsx.
  4. Add regression coverage for auth with suspended/banned users and updated profile payloads. Files:
     backend/src/users/users.int.test.ts, backend/src/users/users.test.ts.

  ## Track B — Rides (Person 2)

  1. Extend ride creation to support optional stops, detour flexibility, ride preferences, zero-price
     rides, and one-time vs recurring offers. Files: backend/src/rides/schemas.ts, backend/src/rides/
     controller.ts, backend/src/rides/router.ts, backend/src/rides/serialize.ts, frontend/src/features/
     rides/types.ts, frontend/src/features/rides/PostRidePage.tsx, frontend/src/features/rides/components/
     RouteInputForm.tsx, new frontend/src/features/rides/components/StopsEditor.tsx, new frontend/src/
     features/rides/components/RidePreferencesInput.tsx, new backend/src/rides/recurrence.ts.
  2. Complete route preview and map metadata by fetching route polyline, distance, and ETA from the
     existing OSM-based stack. Files: frontend/src/components/MapView.tsx, new frontend/src/features/
     rides/routing.ts, frontend/src/features/rides/PostRidePage.tsx, frontend/src/features/rides/
     RideDetailPage.tsx.
  3. Add ride editing for future rides; allow full edits when no confirmed passengers exist, and require
     passenger notifications when confirmed passengers exist. Files: backend/src/rides/controller.ts,
     backend/src/rides/router.ts, frontend/src/features/rides/hooks.ts, frontend/src/features/rides/
     MyRidesPage.tsx, new frontend/src/features/rides/components/EditRideForm.tsx.
  4. Complete operational ride flow: explicit start, finish, and cancellation-strike handling for
     confirmed-passenger cancellations. Files: backend/src/rides/controller.ts, backend/src/rides/
     serialize.ts, frontend/src/features/rides/hooks.ts, frontend/src/features/rides/MyRidesPage.tsx,
     frontend/src/features/rides/RideDetailPage.tsx.
  5. Replace the current simple search ranking with a scoring layer that considers pickup/drop-off
     proximity, stops, detour tolerance, departure window, seats, price, and preferences. Files: backend/
     src/rides/location.ts, new backend/src/rides/matching.ts, backend/src/rides/schemas.ts, frontend/src/
     features/rides/SearchRidesPage.tsx, frontend/src/features/rides/hooks.ts, backend/src/rides/
     rides.test.ts.

  ## Track C — Bookings & Payments (Person 3)

  1. Expand booking creation so passengers choose exact pickup/drop-off points and optional driver notes
     at checkout. Files: backend/src/bookings/schemas.ts, backend/src/bookings/controller.ts, backend/src/
     bookings/router.ts, frontend/src/features/bookings/types.ts, frontend/src/features/bookings/hooks.ts,
     frontend/src/features/bookings/BookingCheckoutPage.tsx.
  2. Introduce a payment adapter with simulated capture now and a replaceable provider boundary later.
     Files: new backend/src/payments/service.ts, backend/src/bookings/controller.ts, backend/src/bookings/
     schemas.ts, frontend/src/features/bookings/BookingCheckoutPage.tsx, frontend/src/features/bookings/
     types.ts.
  3. Implement cancellation policy logic: full refund before 2 hours, 50% refund within 2 hours, no refund
     on no-show. Files: backend/src/bookings/controller.ts, backend/src/bookings/schemas.ts, frontend/src/
     features/bookings/BookingStatusPage.tsx, frontend/src/features/bookings/BookingsPage.tsx, frontend/
     src/features/bookings/types.ts.
  4. Add driver-side passenger pickup and no-show handling per booking during active rides. Files:
     backend/src/bookings/controller.ts, backend/src/bookings/router.ts, frontend/src/features/rides/
     MyRidesPage.tsx, frontend/src/features/rides/RideDetailPage.tsx, frontend/src/features/bookings/
     hooks.ts.
  5. Make “upcoming rides with details” a first-class booking experience rather than a generic list.
     Files: frontend/src/features/bookings/BookingsPage.tsx, frontend/src/features/bookings/
     BookingStatusPage.tsx, frontend/src/features/bookings/hooks.ts, optionally new frontend/src/features/
     bookings/UpcomingRideCard.tsx.
  6. Add booking/payment/refund/no-show integration coverage. Files: backend/src/bookings/
     bookings.integration.test.ts, backend/src/bookings/bookings.test.ts.


## Track D — Admin & Notifications (Person 4)

  1. Turn report handling into a full moderation workflow: report detail view, involved-
     user history, ratings snapshot, resolution note, and linked moderation actions. Files:
     backend/src/admin/ controller.ts, backend/src/admin/router.ts, backend/src/admin/schemas.ts, frontend/src/features/admin/types.ts, frontend/src/features/admin/useReports.ts, frontend/src/features/admin/ReportsPage.tsx, frontend/src/features/admin/ReportsTable.tsx, new frontend/src/features/admin/ReportDetailPanel.tsx.
  2. Add warning, suspension, ban, and unban actions with audit history. Files: backend/src/admin/
     controller.ts, backend/src/admin/router.ts, backend/src/admin/schemas.ts, frontend/src/features/
     admin/types.ts, new frontend/src/features/admin/UserModerationPanel.tsx.
  3. Finish notification delivery for booking requests, ride edits, ride cancellations, ride starts,
     booking status changes, and moderation outcomes. Files: backend/src/lib/socket.types.ts, backend/src/
     lib/notify.ts, backend/src/lib/emailQueue.ts, backend/src/workers/emailWorkers.ts, backend/src/lib/
     emailTemplates.ts, backend/src/bookings/controller.ts, backend/src/rides/controller.ts.
  4. Add lightweight client-side notification consumption using sockets and page-local toasts/banners; do
     not build a full notification center in this phase. Files: frontend/src/lib/socket.ts, new frontend/
     src/hooks/useNotifications.ts, frontend/src/App.tsx, frontend/src/features/bookings/BookingsPage.tsx,
     frontend/src/features/rides/MyRidesPage.tsx, frontend/src/features/admin/ReportsPage.tsx.
  5. Add moderation and notification tests. Files: backend/src/admin/admin.test.ts, new backend/src/admin/
     admin.int.test.ts, extend backend/src/rides/rides.test.ts.

  ## Test Plan

  - Track A: suspended/banned users cannot continue authenticated flows; /api/users/me returns account
    status; client shows deterministic suspension/banned state.
  - Track B: create ride with stops/preferences/recurrence; edit with and without confirmed passengers;
    route preview metadata persists; matching reorders results correctly.
  - Track C: checkout stores pickup/drop-off/message; simulated payment marks booking as paid;
    cancellation refund windows are exact; no-show produces zero refund; picked-up passengers can still
    complete normally.
  - Track D: admin can inspect report detail, warn/suspend/ban, persist resolution notes, and trigger the
    correct email/socket notifications.

  ## Assumptions

  - Target planning artifact name is plan.md.
  - Keep the existing stack: Express + Prisma + Supabase + React + Leaflet; routing uses the existing
    OpenStreetMap/Nominatim setup with an OSRM-style route service for polyline, ETA, and distance.
  - Simulated payments live behind backend/src/payments/service.ts so advanced payment work swaps the
    provider without rewriting booking controllers.
  - Recurring rides are generated as concrete future Ride rows from a RideSeries template for a rolling
    30-day window.
  - Notification scope for this pass is backend delivery plus frontend toasts/banners, not a dedicated
    inbox page.

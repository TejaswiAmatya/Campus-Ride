-- Create enums required by the remaining-scope foundation pass.
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'WARNED', 'SUSPENDED', 'BANNED');
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED');
CREATE TYPE "RideRecurrencePattern" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'SPECIFIC_DAYS');
CREATE TYPE "ModerationActionType" AS ENUM ('WARNING', 'SUSPENSION', 'BAN', 'UNBAN');

-- User moderation state.
ALTER TABLE "User"
ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "suspendedUntil" TIMESTAMP(3);

-- Driver reliability.
ALTER TABLE "DriverProfile"
ADD COLUMN "cancellationStrikes" INTEGER NOT NULL DEFAULT 0;

-- Ride route, preference, and recurrence fields.
ALTER TABLE "Ride"
ADD COLUMN "rideSeriesId" TEXT,
ADD COLUMN "detourFlexibilityKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "preferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "routePolyline" TEXT,
ADD COLUMN "routeDistanceKm" DOUBLE PRECISION,
ADD COLUMN "routeDurationMinutes" INTEGER,
ADD COLUMN "recurrencePattern" "RideRecurrencePattern" NOT NULL DEFAULT 'NONE',
ADD COLUMN "recurrenceDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "recurrenceInstanceAt" TIMESTAMP(3);

-- Booking pickup, drop-off, payment, refund, and check-in fields.
ALTER TABLE "Booking"
ADD COLUMN "pickupAddress" TEXT,
ADD COLUMN "pickupLat" DOUBLE PRECISION,
ADD COLUMN "pickupLng" DOUBLE PRECISION,
ADD COLUMN "dropoffAddress" TEXT,
ADD COLUMN "dropoffLat" DOUBLE PRECISION,
ADD COLUMN "dropoffLng" DOUBLE PRECISION,
ADD COLUMN "messageToDriver" TEXT,
ADD COLUMN "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "refundedAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "checkedInAt" TIMESTAMP(3),
ADD COLUMN "pickedUpAt" TIMESTAMP(3),
ADD COLUMN "noShowMarkedAt" TIMESTAMP(3);

ALTER TABLE "Booking"
ALTER COLUMN "paymentStatus" DROP DEFAULT;

ALTER TABLE "Booking"
ALTER COLUMN "paymentStatus" TYPE "PaymentStatus"
USING (
  CASE "paymentStatus"
    WHEN 'PAID' THEN 'PAID'::"PaymentStatus"
    WHEN 'REFUNDED' THEN 'REFUNDED'::"PaymentStatus"
    WHEN 'PARTIALLY_REFUNDED' THEN 'PARTIALLY_REFUNDED'::"PaymentStatus"
    WHEN 'FAILED' THEN 'FAILED'::"PaymentStatus"
    WHEN 'PENDING' THEN 'PENDING'::"PaymentStatus"
    ELSE 'UNPAID'::"PaymentStatus"
  END
);

ALTER TABLE "Booking"
ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';

-- Recurring ride templates.
CREATE TABLE "RideSeries" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "originAddress" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLng" DOUBLE PRECISION NOT NULL,
    "departureTimeLocal" TEXT NOT NULL,
    "recurrencePattern" "RideRecurrencePattern" NOT NULL DEFAULT 'WEEKLY',
    "recurrenceDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "totalSeats" INTEGER NOT NULL,
    "pricePerSeat" DECIMAL(10,2) NOT NULL,
    "detourFlexibilityKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "routePolyline" TEXT,
    "routeDistanceKm" DOUBLE PRECISION,
    "routeDurationMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideSeries_pkey" PRIMARY KEY ("id")
);

-- Ride waypoints / optional stops.
CREATE TABLE "RideStop" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideStop_pkey" PRIMARY KEY ("id")
);

-- Admin moderation audit trail.
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "reportId" TEXT,
    "actionType" "ModerationActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- Indexes.
CREATE INDEX "Ride_rideSeriesId_idx" ON "Ride"("rideSeriesId");
CREATE UNIQUE INDEX "RideStop_rideId_orderIndex_key" ON "RideStop"("rideId", "orderIndex");
CREATE INDEX "RideStop_rideId_idx" ON "RideStop"("rideId");
CREATE INDEX "ModerationAction_targetUserId_createdAt_idx" ON "ModerationAction"("targetUserId", "createdAt");
CREATE INDEX "ModerationAction_adminId_createdAt_idx" ON "ModerationAction"("adminId", "createdAt");

-- Foreign keys.
ALTER TABLE "Ride"
ADD CONSTRAINT "Ride_rideSeriesId_fkey"
FOREIGN KEY ("rideSeriesId") REFERENCES "RideSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RideSeries"
ADD CONSTRAINT "RideSeries_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RideStop"
ADD CONSTRAINT "RideStop_rideId_fkey"
FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationAction"
ADD CONSTRAINT "ModerationAction_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ModerationAction"
ADD CONSTRAINT "ModerationAction_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationAction"
ADD CONSTRAINT "ModerationAction_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

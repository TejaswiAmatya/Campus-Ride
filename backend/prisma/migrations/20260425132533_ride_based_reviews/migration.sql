-- Drop the old booking-based review relationship.
ALTER TABLE "Review" DROP CONSTRAINT "Review_bookingId_fkey";

DROP INDEX "Review_bookingId_key";

-- Add the new ride-based relationship and backfill existing rows before making it required.
ALTER TABLE "Review" ADD COLUMN "rideId" TEXT;

UPDATE "Review"
SET "rideId" = "Booking"."rideId"
FROM "Booking"
WHERE "Review"."bookingId" = "Booking"."id";

ALTER TABLE "Review" ALTER COLUMN "rideId" SET NOT NULL;

ALTER TABLE "Review" DROP COLUMN "bookingId";

-- Enforce one review per reviewer -> reviewee pair per ride and add read-path indexes.
CREATE UNIQUE INDEX "Review_rideId_reviewerId_revieweeId_key" ON "Review"("rideId", "reviewerId", "revieweeId");
CREATE INDEX "Review_revieweeId_createdAt_idx" ON "Review"("revieweeId", "createdAt");
CREATE INDEX "Review_rideId_idx" ON "Review"("rideId");

ALTER TABLE "Review" ADD CONSTRAINT "Review_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

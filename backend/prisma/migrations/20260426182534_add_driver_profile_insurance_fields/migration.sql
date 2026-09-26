-- Add unified driver-application document fields.
-- Existing records are backfilled implicitly with NULL.
ALTER TABLE "DriverProfile"
ADD COLUMN "insurancePath" TEXT,
ADD COLUMN "rejectionReason" TEXT;

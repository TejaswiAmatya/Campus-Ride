-- Captured drift: FACULTY, APPROVED, mustChangePassword already applied directly to DB
-- Add FACULTY to AcademicRole enum
ALTER TYPE "AcademicRole" ADD VALUE IF NOT EXISTS 'FACULTY';
ALTER TYPE "AcademicVerificationStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
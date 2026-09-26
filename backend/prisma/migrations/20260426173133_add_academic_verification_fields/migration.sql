-- Create enums for optional academic verification.
CREATE TYPE "AcademicRole" AS ENUM ('STUDENT', 'STAFF');
CREATE TYPE "AcademicVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');

-- Add academic verification fields to users.
ALTER TABLE "User"
ADD COLUMN "academicRole" "AcademicRole",
ADD COLUMN "academicVerificationStatus" "AcademicVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN "academicIdPath" TEXT,
ADD COLUMN "academicVerifiedAt" TIMESTAMP(3),
ADD COLUMN "academicRejectionReason" TEXT;

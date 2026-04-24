/*
  Warnings:

  - Added the required column `targetUserRole` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Made the column `targetUserId` on table `Report` required. This step will fail if there are existing NULL values in that column.
  - Made the column `targetRideId` on table `Report` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "targetUserRole" "Role" NOT NULL,
ALTER COLUMN "targetUserId" SET NOT NULL,
ALTER COLUMN "targetRideId" SET NOT NULL;

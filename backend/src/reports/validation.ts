import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";

export async function validateReportTarget(
  reporterId: string,
  targetUserId: string,
  targetRideId: string,
) {
  if (reporterId === targetUserId) {
    throw new AppError("FORBIDDEN", "You cannot report yourself", 403);
  }

  const [targetUser, targetRide] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true },
    }),
    prisma.ride.findUnique({
      where: { id: targetRideId },
      select: { id: true },
    }),
  ]);

  if (!targetUser) {
    throw new AppError("NOT_FOUND", "Target user not found", 404);
  }

  if (!targetRide) {
    throw new AppError("NOT_FOUND", "Target ride not found", 404);
  }

  return targetUser;
}

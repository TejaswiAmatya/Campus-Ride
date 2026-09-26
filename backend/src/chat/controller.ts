import { prisma } from "../lib/prisma";

import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/error";

export async function isRideParticipant(
  rideId: string,
  userId: string,
): Promise<boolean> {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) return false;

  // Driver check
  if (ride.driverId === userId) return true;

  // Confirmed passenger check
  const booking = await prisma.booking.findFirst({
    where: {
      rideId,
      passengerId: userId,
      status: "CONFIRMED",
    },
  });
  return !!booking;
}

export async function getChatHistory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { rideId } = req.params;
    const userId = req.user!.id;

    const allowed = await isRideParticipant(rideId, userId);
    if (!allowed)
      throw new AppError("FORBIDDEN", "Not a ride participant", 403);

    const messages = await prisma.chatMessage.findMany({
      where: { rideId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true, avatarPath: true } },
      },
    });

    res.json(messages);
  } catch (err) {
    next(err);
  }
}

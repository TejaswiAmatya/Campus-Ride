import type { Request, Response, NextFunction } from "express";
import { DriverStatus } from "@prisma/client";
import {
  CreateRideSchema,
  SearchRidesSchema,
  UpdateRideStatusSchema,
} from "./schemas";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";

import {
  mapDriverForApi,
  serializeMyRide,
  serializeRideList,
} from "./serialize";
import { searchRidesByLocation } from "./location";
import { notify } from "../lib/notify";

const rideStatusTransitions = {
  OPEN: ["ACTIVE", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  FULL: ["ACTIVE", "CANCELLED"],
} as const;

function mapRequestedRideStatus(status: "ACTIVE" | "COMPLETED" | "CANCELLED") {
  if (status === "ACTIVE") {
    return "IN_PROGRESS" as const;
  }

  return status;
}

type VehicleInfo = {
  make: string;
  model: string;
  year: number;
  colour: string;
  plateNumber: string;
};

/**
 * POST /api/rides
 *
 * Authenticated driver creates a ride offer.
 * Sets availableSeats = totalSeats initially.
 * Requires role DRIVER and driverProfile.status = APPROVED.
 */
export async function createRide(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = CreateRideSchema.parse(req.body);
    const driverId = req.user?.id;

    if (!driverId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const driver = await prisma.user.findUniqueOrThrow({
      where: { id: driverId },
      select: {
        role: true,
        driverProfile: { select: { status: true } },
      },
    });

    if (
      driver.role !== "DRIVER" ||
      driver.driverProfile?.status !== DriverStatus.APPROVED
    ) {
      throw new AppError(
        "FORBIDDEN",
        "Driver application not yet approved",
        403,
      );
    }

    const ride = await prisma.ride.create({
      data: {
        driverId,
        originAddress: body.origin.address,
        originLat: body.origin.lat,
        originLng: body.origin.lng,
        destinationAddress: body.destination.address,
        destinationLat: body.destination.lat,
        destinationLng: body.destination.lng,
        departureTime: new Date(body.departureTime),
        totalSeats: body.totalSeats,
        availableSeats: body.totalSeats,
        pricePerSeat: body.pricePerSeat,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatarPath: true,
            driverProfile: { select: { vehicleInfo: true } },
          },
        },
      },
    });

    res.status(201).json({ data: serializeRideList(ride) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rides
 *
 * Public search. Filters by date, seats, and geographic proximity.
 *
 * Query params: origin, dest, date (YYYY-MM-DD), seats, originLat, originLng, destLat, destLng, radiusKm
 */
export async function searchRides(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = SearchRidesSchema.parse(req.query);
    const rides = await searchRidesByLocation(query);

    res.json({ data: rides });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rides/mine
 *
 * Returns all rides posted by the authenticated driver, with booking counts.
 */
export async function getMyRides(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.id) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const rides = await prisma.ride.findMany({
      where: { driverId: req.user.id },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatarPath: true,
            driverProfile: { select: { vehicleInfo: true } },
          },
        },
        bookings: {
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                avatarPath: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { departureTime: "desc" },
    });

    res.json({ data: rides.map((ride) => serializeMyRide(ride)) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rides/:id
 *
 * Returns ride detail including driver profile and all bookings (for the driver).
 * Passengers see only seat availability, not other passengers' info.
 */
export async function getRide(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const ride = await prisma.ride.findUniqueOrThrow({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatarPath: true,
            driverProfile: { select: { vehicleInfo: true } },
          },
        },
      },
    });

    res.json({
      data: {
        id: ride.id,
        originAddress: ride.originAddress,
        originLat: ride.originLat,
        originLng: ride.originLng,
        destinationAddress: ride.destinationAddress,
        destinationLat: ride.destinationLat,
        destinationLng: ride.destinationLng,
        departureTime: ride.departureTime.toISOString(),
        availableSeats: ride.availableSeats,
        totalSeats: ride.totalSeats,
        pricePerSeat: ride.pricePerSeat.toString(),
        status: ride.status,
        driver: mapDriverForApi(ride.driver),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/rides/:id/status
 *
 * Driver transitions their ride through stages:
 *   OPEN → IN_PROGRESS → COMPLETED
 *   OPEN → CANCELLED
 *
 * Emits a ride:status Socket.io event to all participants on change.
 */
export async function updateRideStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.id) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const { id } = req.params;
    const body = UpdateRideStatusSchema.parse(req.body);
    const ride = await prisma.ride.findUniqueOrThrow({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatarPath: true,
            driverProfile: { select: { vehicleInfo: true } },
          },
        },
      },
    });

    if (ride.driverId !== req.user.id) {
      throw new AppError("FORBIDDEN", "Not the driver of this ride", 403);
    }

    const allowedTransitions = rideStatusTransitions[ride.status];
    if (!(allowedTransitions as readonly string[]).includes(body.status)) {
      throw new AppError(
        "INVALID_STATUS_TRANSITION",
        `Cannot change ride status from ${ride.status} to ${body.status}`,
        409,
      );
    }

    const updatedRide = await prisma.ride.update({
      where: { id },
      data: { status: mapRequestedRideStatus(body.status) },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatarPath: true,
            driverProfile: { select: { vehicleInfo: true } },
          },
        },
      },
    });

    if (body.status === "ACTIVE") {
      await notify.rideStatus(id, {
        rideId: id,
        bookingId: "",
        status: "in_progress",
      });
    }

    res.json({ data: serializeRideList(updatedRide) });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/rides/:id
 *
 * Soft-cancel: sets status = CANCELLED.
 * Only allowed if no confirmed bookings exist and departure hasn't passed.
 */
export async function cancelRide(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const { ride, notifiedPassengerIds } = await prisma.$transaction(
      async (tx) => {
        const ride = await tx.ride.findUnique({
          where: { id },
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                avatarPath: true,
                driverProfile: { select: { vehicleInfo: true } },
              },
            },
            bookings: {
              select: {
                id: true,
                passengerId: true,
                seatsBooked: true,
                status: true,
              },
            },
          },
        });

        if (!ride) {
          throw new AppError("NOT_FOUND", "Ride not found", 404);
        }

        if (ride.driverId !== userId) {
          throw new AppError("FORBIDDEN", "Not the driver of this ride", 403);
        }

        if (ride.status !== "OPEN" && ride.status !== "FULL") {
          throw new AppError(
            "INVALID_STATE",
            "Only scheduled rides can be cancelled",
            409,
          );
        }

        const confirmedBookings = ride.bookings.filter(
          (booking) => booking.status === "CONFIRMED",
        );
        const pendingBookings = ride.bookings.filter(
          (booking) => booking.status === "PENDING",
        );
        const restoredSeats = confirmedBookings.reduce(
          (total, booking) => total + booking.seatsBooked,
          0,
        );

        if (confirmedBookings.length > 0) {
          await tx.booking.updateMany({
            where: {
              rideId: id,
              status: "CONFIRMED",
            },
            data: { status: "CANCELLED" },
          });
        }

        if (pendingBookings.length > 0) {
          await tx.booking.updateMany({
            where: {
              rideId: id,
              status: "PENDING",
            },
            data: { status: "CANCELLED" },
          });
        }

        const updatedRide = await tx.ride.update({
          where: { id },
          data: {
            status: "CANCELLED",
            availableSeats: Math.min(
              ride.availableSeats + restoredSeats,
              ride.totalSeats,
            ),
          },
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                avatarPath: true,
                driverProfile: { select: { vehicleInfo: true } },
              },
            },
          },
        });

        return {
          ride: updatedRide,
          notifiedPassengerIds: confirmedBookings.map(
            (booking) => booking.passengerId,
          ),
        };
      },
    );

    if (notifiedPassengerIds.length > 0) {
      await notify.rideStatus(id, {
        rideId: id,
        bookingId: "",
        status: "cancelled",
      });
    }

    res.json({ data: serializeRideList(ride) });
  } catch (err) {
    next(err);
  }
}

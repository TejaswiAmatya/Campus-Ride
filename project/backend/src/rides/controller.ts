import type { Request, Response, NextFunction } from "express";
import {
  CreateRideSchema,
  SearchRidesSchema,
  UpdateRideStatusSchema,
} from "./schemas";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { searchRidesByLocation } from "./location.service";

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
 * Requires the authenticated user to have an approved driver profile.
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
        driverProfile: {
          select: { status: true },
        },
      },
    });

    if (driver.driverProfile?.status !== "APPROVED") {
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
          select: { id: true, name: true, avatarPath: true },
        },
      },
    });

    res.status(201).json({
      data: {
        ...ride,
        driver: {
          id: ride.driver.id,
          name: ride.driver.name,
          avatarUrl: ride.driver.avatarPath,
        },
      },
    });
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
      include: { _count: { select: { bookings: true } } },
      orderBy: { departureTime: "desc" },
    });

    res.json({ data: rides });
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
            driverProfile: {
              select: { vehicleInfo: true },
            },
          },
        },
        bookings: {
          where: { status: "CONFIRMED" },
          select: {
            passenger: {
              select: { id: true, name: true, avatarPath: true },
            },
          },
        },
      },
    });

    const participants = [
      {
        id: ride.driver.id,
        name: ride.driver.name,
        avatarUrl: ride.driver.avatarPath,
      },
      ...ride.bookings.map((booking) => ({
        id: booking.passenger.id,
        name: booking.passenger.name,
        avatarUrl: booking.passenger.avatarPath,
      })),
    ];

    res.json({
      data: {
        ...ride,
        participants,
        driver: {
          id: ride.driver.id,
          name: ride.driver.name,
          avatarUrl: ride.driver.avatarPath,
          vehicle: (ride.driver.driverProfile?.vehicleInfo as VehicleInfo | null) ?? null,
        },
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
    const { id } = req.params;
    const body = UpdateRideStatusSchema.parse(req.body);

    // TODO:
    // const ride = await prisma.ride.findUniqueOrThrow({ where: { id } })
    // if (ride.driverId !== req.user!.id) throw new AppError('FORBIDDEN', 'Not the driver of this ride', 403)
    // const updated = await prisma.ride.update({ where: { id }, data: { status: body.status } })
    //
    // notify.rideStatus(id, { status: body.status, updatedAt: new Date().toISOString() })
    // res.json({ data: updated })

    void AppError;
    res.json({
      message: "TODO: update ride status",
      rideId: id,
      status: body.status,
    });
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

    // TODO: check ownership, check no confirmed bookings, set status = CANCELLED
    // Cancel all pending bookings and refund if Stripe is integrated

    res.json({ message: "TODO: cancel ride", rideId: id });
  } catch (err) {
    next(err);
  }
}

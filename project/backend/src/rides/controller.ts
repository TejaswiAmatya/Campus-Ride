import type { Request, Response, NextFunction } from "express";
import { DriverStatus } from "@prisma/client";
import {
  CreateRideSchema,
  CreateRideReviewSchema,
  SearchRidesSchema,
  StartRideSchema,
  UpdateRideSchema,
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
import { emailQueue } from "../lib/emailQueue";
import {
  formatDepartureTimeLocal,
  generateRideOccurrences,
} from "./recurrence";

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

const participatedBookingStatuses = new Set(["CONFIRMED", "COMPLETED"]);

function normalizeRecurrencePattern(
  offerType: "ONE_TIME" | "RECURRING",
  recurrencePattern: "NONE" | "DAILY" | "WEEKLY" | "SPECIFIC_DAYS",
) {
  return offerType === "RECURRING" ? recurrencePattern : "NONE";
}

function arraysEqual<T>(left: T[], right: T[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function stopsEqual(
  left: Array<{ address: string; lat: number; lng: number }>,
  right: Array<{ address: string; lat: number; lng: number }>,
) {
  return (
    left.length === right.length &&
    left.every((stop, index) => {
      const other = right[index];
      return (
        stop.address === other?.address &&
        stop.lat === other?.lat &&
        stop.lng === other?.lng
      );
    })
  );
}

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

    const recurrencePattern = normalizeRecurrencePattern(
      body.offerType,
      body.recurrencePattern,
    );
    const recurrenceDays =
      recurrencePattern === "SPECIFIC_DAYS"
        ? body.recurrenceDays
        : recurrencePattern === "WEEKLY"
          ? [new Date(body.departureTime).getDay()]
          : body.recurrenceDays;

    const occurrences = generateRideOccurrences({
      offerType: body.offerType,
      departureTime: body.departureTime,
      recurrencePattern,
      recurrenceDays,
      recurrenceEndDate: body.recurrenceEndDate ?? null,
    });

    const ride = await prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      const rideSeriesClient =
        typeof txAny.rideSeries?.create === "function"
          ? txAny.rideSeries
          : prisma.rideSeries;
      const rideCreateClient =
        typeof txAny.ride?.create === "function" ? txAny.ride : prisma.ride;
      let rideSeriesId: string | null = null;

      if (body.offerType === "RECURRING") {
        const series = await rideSeriesClient.create({
          data: {
            driverId,
            originAddress: body.origin.address,
            originLat: body.origin.lat,
            originLng: body.origin.lng,
            destinationAddress: body.destination.address,
            destinationLat: body.destination.lat,
            destinationLng: body.destination.lng,
            departureTimeLocal: formatDepartureTimeLocal(body.departureTime),
            recurrencePattern,
            recurrenceDays,
            startDate: new Date(body.departureTime),
            endDate: body.recurrenceEndDate
              ? new Date(body.recurrenceEndDate)
              : null,
            totalSeats: body.totalSeats,
            pricePerSeat: body.pricePerSeat,
            detourFlexibilityKm: body.detourFlexibilityKm,
            preferences: body.preferences,
            routePolyline: body.routePolyline ?? null,
            routeDistanceKm: body.routeDistanceKm ?? null,
            routeDurationMinutes: body.routeDurationMinutes ?? null,
          },
        });
        rideSeriesId = series.id;
      }

      const createdRides = [];
      for (const occurrence of occurrences) {
        const createdRide = await rideCreateClient.create({
          data: {
            driverId,
            rideSeriesId,
            originAddress: body.origin.address,
            originLat: body.origin.lat,
            originLng: body.origin.lng,
            destinationAddress: body.destination.address,
            destinationLat: body.destination.lat,
            destinationLng: body.destination.lng,
            departureTime: occurrence,
            totalSeats: body.totalSeats,
            availableSeats: body.totalSeats,
            pricePerSeat: body.pricePerSeat,
            detourFlexibilityKm: body.detourFlexibilityKm,
            preferences: body.preferences,
            routePolyline: body.routePolyline ?? null,
            routeDistanceKm: body.routeDistanceKm ?? null,
            routeDurationMinutes: body.routeDurationMinutes ?? null,
            recurrencePattern,
            recurrenceDays,
            recurrenceInstanceAt:
              body.offerType === "RECURRING" ? occurrence : null,
            stops: {
              create: body.stops.map((stop, index) => ({
                address: stop.address,
                lat: stop.lat,
                lng: stop.lng,
                orderIndex: index,
              })),
            },
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
            stops: { orderBy: { orderIndex: "asc" } },
          },
        });
        createdRides.push(createdRide);
      }

      return createdRides[0];
    });

    res.status(201).json({ data: serializeRideList(ride) });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/rides/:id
 *
 * Contract-stub for editing an upcoming ride offer.
 */
export async function updateRide(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const driverId = req.user?.id;
    if (!driverId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const body = UpdateRideSchema.parse(req.body);
    const ride = await prisma.ride.findUnique({
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
          where: { status: "CONFIRMED" },
          select: { id: true, passengerId: true, seatsBooked: true },
        },
        stops: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!ride) {
      throw new AppError("NOT_FOUND", "Ride not found", 404);
    }
    if (ride.driverId !== driverId) {
      throw new AppError("FORBIDDEN", "Not the driver of this ride", 403);
    }
    if (ride.status !== "OPEN" && ride.status !== "FULL") {
      throw new AppError(
        "INVALID_STATE",
        "Only scheduled rides can be edited",
        409,
      );
    }

    const confirmedSeats = ride.bookings.reduce(
      (total, booking) => total + booking.seatsBooked,
      0,
    );
    if (
      body.totalSeats !== undefined &&
      body.totalSeats < confirmedSeats
    ) {
      throw new AppError(
        "INVALID_SEAT_COUNT",
        `Total seats cannot be lower than ${confirmedSeats} confirmed seats`,
        409,
      );
    }

    const normalizedExistingStops = ride.stops.map((stop) => ({
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
    }));
    const normalizedIncomingStops = body.stops?.map((stop) => ({
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
    }));

    const meaningfulChangeDetected =
      (body.origin?.address !== undefined &&
        body.origin.address !== ride.originAddress) ||
      (body.origin?.lat !== undefined && body.origin.lat !== ride.originLat) ||
      (body.origin?.lng !== undefined && body.origin.lng !== ride.originLng) ||
      (body.destination?.address !== undefined &&
        body.destination.address !== ride.destinationAddress) ||
      (body.destination?.lat !== undefined &&
        body.destination.lat !== ride.destinationLat) ||
      (body.destination?.lng !== undefined &&
        body.destination.lng !== ride.destinationLng) ||
      (body.departureTime !== undefined &&
        new Date(body.departureTime).toISOString() !==
          ride.departureTime.toISOString()) ||
      (body.totalSeats !== undefined && body.totalSeats !== ride.totalSeats) ||
      (body.pricePerSeat !== undefined &&
        body.pricePerSeat !== Number(ride.pricePerSeat)) ||
      (body.detourFlexibilityKm !== undefined &&
        body.detourFlexibilityKm !== ride.detourFlexibilityKm) ||
      (body.preferences !== undefined &&
        !arraysEqual(body.preferences, ride.preferences)) ||
      (body.routePolyline !== undefined &&
        body.routePolyline !== ride.routePolyline) ||
      (body.routeDistanceKm !== undefined &&
        body.routeDistanceKm !== ride.routeDistanceKm) ||
      (body.routeDurationMinutes !== undefined &&
        body.routeDurationMinutes !== ride.routeDurationMinutes) ||
      (normalizedIncomingStops !== undefined &&
        !stopsEqual(normalizedIncomingStops, normalizedExistingStops));

    const notificationRequired =
      meaningfulChangeDetected && ride.bookings.length > 0;

    const updated = await prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      const rideStopClient =
        typeof txAny.rideStop?.deleteMany === "function"
          ? txAny.rideStop
          : prisma.rideStop;
      const rideUpdateClient =
        typeof txAny.ride?.update === "function" ? txAny.ride : prisma.ride;

      if (body.stops) {
        await rideStopClient.deleteMany({ where: { rideId: id } });
      }

      return rideUpdateClient.update({
        where: { id },
        data: {
          ...(body.origin?.address && { originAddress: body.origin.address }),
          ...(body.origin?.lat !== undefined && { originLat: body.origin.lat }),
          ...(body.origin?.lng !== undefined && { originLng: body.origin.lng }),
          ...(body.destination?.address && {
            destinationAddress: body.destination.address,
          }),
          ...(body.destination?.lat !== undefined && {
            destinationLat: body.destination.lat,
          }),
          ...(body.destination?.lng !== undefined && {
            destinationLng: body.destination.lng,
          }),
          ...(body.departureTime && {
            departureTime: new Date(body.departureTime),
          }),
          ...(body.totalSeats !== undefined && {
            totalSeats: body.totalSeats,
            availableSeats: Math.max(body.totalSeats - confirmedSeats, 0),
            status:
              body.totalSeats - confirmedSeats > 0 ? "OPEN" : "FULL",
          }),
          ...(body.pricePerSeat !== undefined && {
            pricePerSeat: body.pricePerSeat,
          }),
          ...(body.detourFlexibilityKm !== undefined && {
            detourFlexibilityKm: body.detourFlexibilityKm,
          }),
          ...(body.preferences && { preferences: body.preferences }),
          ...(body.routePolyline !== undefined && {
            routePolyline: body.routePolyline,
          }),
          ...(body.routeDistanceKm !== undefined && {
            routeDistanceKm: body.routeDistanceKm,
          }),
          ...(body.routeDurationMinutes !== undefined && {
            routeDurationMinutes: body.routeDurationMinutes,
          }),
          ...(body.stops && {
            stops: {
              create: body.stops.map((stop, index) => ({
                address: stop.address,
                lat: stop.lat,
                lng: stop.lng,
                orderIndex: index,
              })),
            },
          }),
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
          stops: {
            orderBy: { orderIndex: "asc" },
          },
        },
      });
    });

    if (notificationRequired) {
      const updatedAt = new Date().toISOString();
      await Promise.all(
        ride.bookings.map((booking) =>
          notify.bookingStatus(booking.passengerId, {
            bookingId: booking.id,
            status: "confirmed",
            updatedAt,
          }),
        ),
      );
      await emailQueue.rideUpdated(id, body.updateMessage?.trim() || undefined);
    }

    res.json({
      data: serializeRideList(updated),
      meta: {
        notificationRequired,
        notificationsTriggered: notificationRequired,
        confirmedPassengers: ride.bookings.length,
        updateMessage: body.updateMessage ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/rides/:id/start
 *
 * Contract-stub for explicit ride start.
 */
export async function startRide(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const driverId = req.user?.id;
    if (!driverId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const body = StartRideSchema.parse(req.body);
    const ride = await prisma.ride.findUnique({
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
          where: { status: "CONFIRMED" },
          select: { id: true },
        },
      },
    });

    if (!ride) {
      throw new AppError("NOT_FOUND", "Ride not found", 404);
    }
    if (ride.driverId !== driverId) {
      throw new AppError("FORBIDDEN", "Not the driver of this ride", 403);
    }
    if (ride.status !== "OPEN" && ride.status !== "FULL") {
      throw new AppError(
        "INVALID_STATE",
        "Only scheduled rides can be started",
        409,
      );
    }
    if (ride.bookings.length === 0) {
      throw new AppError(
        "NO_CONFIRMED_PASSENGERS",
        "Cannot start a ride without at least one confirmed passenger",
        409,
      );
    }

    const updated = await prisma.ride.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
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
      data: serializeRideList(updated),
      meta: {
        startedAt: body.startedAt ?? new Date().toISOString(),
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
        reviews: {
          select: {
            id: true,
            reviewerId: true,
            revieweeId: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
        stops: {
          orderBy: { orderIndex: "asc" },
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
        bookings: {
          where: { status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                avatarPath: true,
              },
            },
          },
        },
        stops: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    const participants = [
      {
        id: ride.driver.id,
        name: ride.driver.name,
        avatarUrl: ride.driver.avatarPath ?? null,
      },
      ...ride.bookings.map((booking) => ({
        id: booking.passenger.id,
        name: booking.passenger.name,
        avatarUrl: booking.passenger.avatarPath ?? null,
      })),
    ].filter(
      (participant, index, all) =>
        all.findIndex((candidate) => candidate.id === participant.id) === index,
    );

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
        detourFlexibilityKm: ride.detourFlexibilityKm,
        preferences: ride.preferences,
        routePolyline: ride.routePolyline,
        routeDistanceKm: ride.routeDistanceKm,
        routeDurationMinutes: ride.routeDurationMinutes,
        recurrencePattern: ride.recurrencePattern,
        recurrenceDays: ride.recurrenceDays,
        recurrenceInstanceAt: ride.recurrenceInstanceAt?.toISOString() ?? null,
        offerType:
          ride.rideSeriesId || ride.recurrencePattern !== "NONE"
            ? "RECURRING"
            : "ONE_TIME",
        rideSeriesId: ride.rideSeriesId,
        stops: ride.stops.map((stop) => ({
          id: stop.id,
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng,
          orderIndex: stop.orderIndex,
        })),
        status: ride.status,
        driver: mapDriverForApi(ride.driver),
        participants,
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
        bookings: {
          where: { status: "CONFIRMED" },
          select: { id: true },
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
    const confirmedBookings = ride.bookings ?? [];
    if (body.status === "ACTIVE" && confirmedBookings.length === 0) {
      throw new AppError(
        "NO_CONFIRMED_PASSENGERS",
        "Cannot start a ride without at least one confirmed passenger",
        409,
      );
    }

    const updatedRide =
      body.status === "COMPLETED"
        ? await prisma.$transaction(async (tx) => {
            await tx.booking.updateMany({
              where: {
                rideId: id,
                status: "CONFIRMED",
              },
              data: { status: "COMPLETED" },
            });

            return tx.ride.update({
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
          })
        : await prisma.ride.update({
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
      try {
        await emailQueue.rideStarted(updatedRide.id);
      } catch (queueErr) {
        console.error("[rides/status] rideStarted queue failed", {
          rideId: updatedRide.id,
          error: queueErr,
        });
      }

      await notify.rideStatus(id, {
        rideId: id,
        bookingId: "",
        status: "in_progress",
      });
    }

    if (body.status === "COMPLETED") {
      await notify.rideStatus(id, {
        rideId: id,
        bookingId: "",
        status: "finished",
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

/**
 * POST /api/rides/:rideId/reviews
 */
export async function createReview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = CreateRideReviewSchema.parse(req.body);
    const reviewerId = req.user?.id;
    const { rideId } = req.params;

    if (!reviewerId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
      select: {
        id: true,
        name: true,
        avatarPath: true,
      },
    });

    if (!reviewer) {
      throw new AppError("UNAUTHORIZED", "Authenticated user not found", 401);
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        bookings: {
          select: {
            passengerId: true,
            status: true,
          },
        },
      },
    });

    if (!ride) {
      throw new AppError("NOT_FOUND", "Ride not found", 404);
    }

    if (ride.status !== "COMPLETED") {
      throw new AppError(
        "INVALID_RIDE_STATUS",
        "Reviews can only be created for completed rides",
        409,
      );
    }

    const requesterParticipated =
      ride.driverId === reviewerId ||
      ride.bookings.some(
        (booking) =>
          booking.passengerId === reviewerId &&
          participatedBookingStatuses.has(booking.status),
      );

    if (!requesterParticipated) {
      throw new AppError(
        "FORBIDDEN",
        "Only ride participants can leave reviews",
        403,
      );
    }

    const revieweeParticipated =
      ride.driverId === body.revieweeId ||
      ride.bookings.some(
        (booking) =>
          booking.passengerId === body.revieweeId &&
          participatedBookingStatuses.has(booking.status),
      );

    if (!revieweeParticipated) {
      throw new AppError(
        "INVALID_REVIEWEE",
        "Reviewee must be a participant in this ride",
        400,
      );
    }

    if (reviewerId === body.revieweeId) {
      throw new AppError("INVALID_REVIEWEE", "You cannot review yourself", 400);
    }

    const existingReview = await prisma.review.findUnique({
      where: {
        rideId_reviewerId_revieweeId: {
          rideId,
          reviewerId,
          revieweeId: body.revieweeId,
        },
      },
    });

    if (existingReview) {
      throw new AppError(
        "DUPLICATE_REVIEW",
        "You have already reviewed this participant for this ride",
        409,
      );
    }

    const review = await prisma.review.create({
      data: {
        rideId,
        reviewerId,
        revieweeId: body.revieweeId,
        rating: body.rating,
        comment: body.comment,
      },
    });

    res.status(201).json({
      data: {
        id: review.id,
        rideId: review.rideId,
        revieweeId: review.revieweeId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        reviewer: {
          id: reviewer.id,
          name: reviewer.name,
          avatarPath: reviewer.avatarPath,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

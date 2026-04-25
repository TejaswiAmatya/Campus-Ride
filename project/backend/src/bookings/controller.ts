import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import {
  CancelBookingSchema,
  CreateBookingSchema,
  CreateReviewSchema,
  ListBookingsSchema,
  UpdateBookingCheckpointSchema,
} from "./schemas";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { emailQueue } from "../lib/emailQueue";
import { getPlatformFeePercent, getPlatformFeeRate } from "../config/service";
import { getStartOfWeek } from "../lib/date";
import { payments } from "../payments/service";
import { randomUUID } from "crypto";

function isSerializationFailure(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2034"
  );
}

function sumDecimal(
  values: Array<Prisma.Decimal | string | number>,
): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (total, value) =>
      total.add(new Prisma.Decimal(value.toString())) as Prisma.Decimal,
    new Prisma.Decimal(0),
  );
}

function serializeBookingList(b: any) {
  return {
    id: b.id,
    status: b.status,
    seatsBooked: b.seatsBooked,
    totalFare: b.totalFare.toString(),
    refundedAmount: b.refundedAmount.toString(),
    paymentStatus: b.paymentStatus,
    paidAt: b.paidAt?.toISOString() ?? null,
    refundedAt: b.refundedAt?.toISOString() ?? null,
    cancelledAt: b.cancelledAt?.toISOString() ?? null,
    pickedUpAt: b.pickedUpAt?.toISOString() ?? null,
    noShowMarkedAt: b.noShowMarkedAt?.toISOString() ?? null,
    pickup: b.pickupAddress
      ? {
          address: b.pickupAddress,
          lat: b.pickupLat,
          lng: b.pickupLng,
        }
      : null,
    dropoff: b.dropoffAddress
      ? {
          address: b.dropoffAddress,
          lat: b.dropoffLat,
          lng: b.dropoffLng,
        }
      : null,
    messageToDriver: b.messageToDriver ?? null,
    ...buildPaymentSnapshot(b),
    cancellation: buildCancellationSnapshot(b),
    createdAt: b.createdAt.toISOString(),
    passenger: b.passenger,
    ride: {
      id: b.ride.id,
      originAddress: b.ride.originAddress,
      destinationAddress: b.ride.destinationAddress,
      departureTime: b.ride.departureTime.toISOString(),
      driver: { id: b.ride.driver.id, name: b.ride.driver.name },
    },
  };
}

function serializeBookingDetail(b: any) {
  return {
    id: b.id,
    status: b.status,
    seatsBooked: b.seatsBooked,
    totalFare: b.totalFare.toString(),
    platformFee: b.platformFee.toString(),
    driverEarnings: b.driverEarnings.toString(),
    refundedAmount: b.refundedAmount.toString(),
    paymentStatus: b.paymentStatus,
    paidAt: b.paidAt?.toISOString() ?? null,
    refundedAt: b.refundedAt?.toISOString() ?? null,
    cancelledAt: b.cancelledAt?.toISOString() ?? null,
    checkedInAt: b.checkedInAt?.toISOString() ?? null,
    pickedUpAt: b.pickedUpAt?.toISOString() ?? null,
    noShowMarkedAt: b.noShowMarkedAt?.toISOString() ?? null,
    pickup: b.pickupAddress
      ? {
          address: b.pickupAddress,
          lat: b.pickupLat,
          lng: b.pickupLng,
        }
      : null,
    dropoff: b.dropoffAddress
      ? {
          address: b.dropoffAddress,
          lat: b.dropoffLat,
          lng: b.dropoffLng,
        }
      : null,
    messageToDriver: b.messageToDriver ?? null,
    cancellation: buildCancellationSnapshot(b),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    passenger: {
      id: b.passenger.id,
      name: b.passenger.name,
      avatarUrl: b.passenger.avatarPath ?? null,
    },
    ride: {
      id: b.ride.id,
      originAddress: b.ride.originAddress,
      originLat: b.ride.originLat,
      originLng: b.ride.originLng,
      destinationAddress: b.ride.destinationAddress,
      destinationLat: b.ride.destinationLat,
      destinationLng: b.ride.destinationLng,
      departureTime: b.ride.departureTime.toISOString(),
      availableSeats: b.ride.availableSeats,
      totalSeats: b.ride.totalSeats,
      pricePerSeat: b.ride.pricePerSeat.toString(),
      status: b.ride.status,
      driver: {
        id: b.ride.driver.id,
        name: b.ride.driver.name,
        avatarUrl: b.ride.driver.avatarPath ?? null,
      },
    },
  };
}

function buildPaymentSnapshot(
  booking: {
    totalFare: Prisma.Decimal | string | number;
    refundedAmount?: Prisma.Decimal | string | number | null;
    paymentStatus: string;
    paidAt?: Date | null;
    refundedAt?: Date | null;
  },
) {
  const totalFare = new Prisma.Decimal(booking.totalFare?.toString() ?? "0");
  const refundedAmount = new Prisma.Decimal(
    booking.refundedAmount?.toString() ?? "0",
  );

  return {
    payment: {
      status: booking.paymentStatus,
      paidAt: booking.paidAt?.toISOString() ?? null,
      refundedAt: booking.refundedAt?.toISOString() ?? null,
    },
    refund: {
      amount: refundedAmount.toString(),
      remainingCharged: totalFare.sub(refundedAmount).toString(),
    },
  };
}

function buildCancellationSnapshot(booking: {
  status?: string;
  totalFare: Prisma.Decimal | string | number;
  refundedAmount?: Prisma.Decimal | string | number | null;
  noShowMarkedAt?: Date | null;
}) {
  const totalFare = new Prisma.Decimal(booking.totalFare?.toString() ?? "0");
  const refundedAmount = new Prisma.Decimal(
    booking.refundedAmount?.toString() ?? "0",
  );

  let policyApplied: "FREE" | "PARTIAL" | "NO_REFUND" | null = null;
  if (booking.noShowMarkedAt) {
    policyApplied = "NO_REFUND";
  } else if (booking.status === "CANCELLED") {
    if (refundedAmount.gte(totalFare) && totalFare.gt(0)) {
      policyApplied = "FREE";
    } else if (refundedAmount.gt(0)) {
      policyApplied = "PARTIAL";
    } else {
      policyApplied = "NO_REFUND";
    }
  }

  return {
    policyApplied,
    rules: {
      fullRefundBeforeHours: 2,
      partialRefundPercent: 50,
      noShowRefundPercent: 0,
    },
  };
}

function getCancellationRefundResult(
  departureTime: Date,
  totalFare: Prisma.Decimal,
): {
  refundAmount: Prisma.Decimal;
  policyWindow: "FREE" | "PARTIAL" | "NO_REFUND";
} {
  const now = new Date();
  const millisecondsUntilDeparture = departureTime.getTime() - now.getTime();
  const twoHoursInMs = 2 * 60 * 60 * 1000;

  if (millisecondsUntilDeparture > twoHoursInMs) {
    return {
      refundAmount: totalFare,
      policyWindow: "FREE",
    };
  }

  if (millisecondsUntilDeparture > 0) {
    return {
      refundAmount: totalFare.mul(0.5),
      policyWindow: "PARTIAL",
    };
  }

  return {
    refundAmount: new Prisma.Decimal(0),
    policyWindow: "NO_REFUND",
  };
}

/**
 * POST /api/bookings
 *
 * Serializable transaction: re-check seats, create booking, decrement seats.
 */
export async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = CreateBookingSchema.parse(req.body);
    const passengerId = req.user?.id;
    if (!passengerId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const maxAttempts = 5;
    const bookingId = randomUUID();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const booking = await prisma.$transaction(
          async (tx) => {
            const ride = await tx.ride.findUnique({
              where: { id: body.rideId },
              select: {
                id: true,
                driverId: true,
                status: true,
                availableSeats: true,
                pricePerSeat: true,
                originAddress: true,
                originLat: true,
                originLng: true,
                destinationAddress: true,
                destinationLat: true,
                destinationLng: true,
              },
            });

            if (!ride) {
              throw new AppError("NOT_FOUND", "Ride not found", 404);
            }
            if (ride.driverId === passengerId) {
              throw new AppError(
                "FORBIDDEN",
                "You cannot book your own ride",
                403,
              );
            }
            if (ride.status !== "OPEN") {
              throw new AppError(
                "RIDE_NOT_OPEN",
                "This ride is not accepting bookings",
                409,
              );
            }
            if (ride.availableSeats < body.seatsBooked) {
              throw new AppError(
                "SEATS_UNAVAILABLE",
                "Not enough seats available",
                409,
              );
            }

            const pricePerSeat = new Prisma.Decimal(
              ride.pricePerSeat.toString(),
            );
            const totalFare = pricePerSeat.mul(body.seatsBooked);
            const platformFeeRate = await getPlatformFeeRate(tx);
            const platformFee = totalFare.mul(platformFeeRate);
            const driverEarnings = totalFare.sub(platformFee);
            const pickup = body.pickup ?? {
              address: ride.originAddress,
              lat: ride.originLat,
              lng: ride.originLng,
            };
            const dropoff = body.dropoff ?? {
              address: ride.destinationAddress,
              lat: ride.destinationLat,
              lng: ride.destinationLng,
            };
            const paymentCapture = await payments.capture({
              amount: totalFare,
              currency: "NOK",
              bookingId,
              rideId: ride.id,
              passengerId,
            });

            if (paymentCapture.status !== "PAID") {
              throw new AppError(
                "PAYMENT_CAPTURE_FAILED",
                "Could not capture payment for this booking",
                402,
              );
            }

            const created = await tx.booking.create({
              data: {
                id: bookingId,
                rideId: ride.id,
                passengerId,
                seatsBooked: body.seatsBooked,
                pickupAddress: pickup.address,
                pickupLat: pickup.lat,
                pickupLng: pickup.lng,
                dropoffAddress: dropoff.address,
                dropoffLat: dropoff.lat,
                dropoffLng: dropoff.lng,
                messageToDriver: body.messageToDriver,
                totalFare,
                platformFee,
                driverEarnings,
                status: "PENDING",
                stripePaymentIntentId: paymentCapture.providerPaymentId,
                paymentStatus: paymentCapture.status,
                paidAt: paymentCapture.paidAt,
              } as any,
              include: {
                ride: {
                  include: { driver: { select: { id: true, name: true } } },
                },
                passenger: { select: { id: true, name: true } },
              },
            });

            const newAvailable = ride.availableSeats - body.seatsBooked;
            await tx.ride.update({
              where: { id: ride.id },
              data: {
                availableSeats: newAvailable,
                status: newAvailable === 0 ? "FULL" : "OPEN",
              },
            });

            return created;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        res.status(201).json({
          data: {
            ...serializeBookingList(booking),
            ...buildPaymentSnapshot(booking),
          },
        });
        return;
      } catch (err) {
        if (isSerializationFailure(err)) {
          continue;
        }
        next(err);
        return;
      }
    }

    next(
      new AppError(
        "BOOKING_CONFLICT",
        "Could not complete booking due to high demand. Please try again.",
        409,
      ),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookings
 *
 * List bookings for the authenticated user (passenger or driver).
 * Query params:
 *   - asDriver=true: View as driver (requires ride.driverId === userId)
 *   - status=PENDING|CONFIRMED|CANCELLED|COMPLETED: Filter by booking status
 */
export async function listBookings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const query = ListBookingsSchema.parse(req.query);
    const asDriver = query.asDriver;
    const statusFilter = query.status;
    const now = new Date();

    if (asDriver) {
      const bookings = await prisma.booking.findMany({
        where: {
          ride: {
            driverId: userId,
            ...(query.upcoming && {
              departureTime: { gte: now },
            }),
          },
          ...(statusFilter && { status: statusFilter }),
        },
        include: {
          passenger: { select: { id: true, name: true } },
          ride: { include: { driver: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ data: bookings.map(serializeBookingList) });
      return;
    }

    const bookings = await prisma.booking.findMany({
      where: {
        passengerId: userId,
        ...(statusFilter && { status: statusFilter }),
        ...(query.upcoming && {
          ride: {
            departureTime: { gte: now },
          },
        }),
      },
      include: {
        passenger: { select: { id: true, name: true } },
        ride: { include: { driver: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: bookings.map(serializeBookingList) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookings/:id
 */
export async function getBooking(
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

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        ride: {
          include: {
            driver: { select: { id: true, name: true, avatarPath: true } },
          },
        },
        passenger: { select: { id: true, name: true, avatarPath: true } },
      },
    });

    if (!booking) {
      throw new AppError("NOT_FOUND", "Booking not found", 404);
    }

    const isPassenger = booking.passengerId === userId;
    const isDriver = booking.ride.driverId === userId;
    if (!isPassenger && !isDriver) {
      throw new AppError("FORBIDDEN", "You cannot view this booking", 403);
    }

    res.json({ data: serializeBookingDetail(booking) });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/confirm
 */
export async function confirmBooking(
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

    const maxRetries = 3;
    let updated: Prisma.BookingGetPayload<{
      include: {
        ride: { include: { driver: { select: { id: true; name: true } } } };
        passenger: { select: { id: true; name: true } };
      };
    }> | null = null;

    for (let attempt = 1; ; attempt += 1) {
      try {
        updated = await prisma.$transaction(
          async (tx) => {
            const booking = await tx.booking.findUnique({
              where: { id },
              include: { ride: { select: { driverId: true } } },
            });

            if (!booking) {
              throw new AppError("NOT_FOUND", "Booking not found", 404);
            }
            if (booking.ride.driverId !== userId) {
              throw new AppError(
                "FORBIDDEN",
                "Only the driver can confirm this booking",
                403,
              );
            }

            const result = await tx.booking.updateMany({
              where: { id, status: "PENDING" },
              data: { status: "CONFIRMED" },
            });

            if (result.count === 0) {
              throw new AppError(
                "INVALID_STATE",
                "Only pending bookings can be confirmed",
                409,
              );
            }

            const confirmedBooking = await tx.booking.findUnique({
              where: { id },
              include: {
                ride: {
                  include: { driver: { select: { id: true, name: true } } },
                },
                passenger: { select: { id: true, name: true } },
              },
            });

            if (!confirmedBooking) {
              throw new AppError("NOT_FOUND", "Booking not found", 404);
            }
            return confirmedBooking;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        break;
      } catch (err) {
        if (attempt < maxRetries && isSerializationFailure(err)) {
          continue;
        }
        throw err;
      }
    }

    if (!updated) {
      throw new AppError("INTERNAL_ERROR", "Booking confirmation failed", 500);
    }

    try {
      await emailQueue.bookingConfirmed(updated.id);
    } catch (queueErr) {
      console.error("[bookings/confirm] bookingConfirmed queue failed", {
        bookingId: updated.id,
        error: queueErr,
      });
    }

    res.json({ data: serializeBookingList(updated) });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/decline
 */
export async function declineBooking(
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

    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { ride: { select: { driverId: true, id: true } } },
      });

      if (!booking) {
        throw new AppError("NOT_FOUND", "Booking not found", 404);
      }
      if (booking.ride.driverId !== userId) {
        throw new AppError(
          "FORBIDDEN",
          "Only the driver can decline this booking",
          403,
        );
      }
      if (booking.status !== "PENDING") {
        throw new AppError(
          "INVALID_STATE",
          "Only pending bookings can be declined",
          409,
        );
      }

      await tx.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      const ride = await tx.ride.findUniqueOrThrow({
        where: { id: booking.rideId },
        select: { availableSeats: true, totalSeats: true, status: true },
      });

      const newAvailable = ride.availableSeats + booking.seatsBooked;
      await tx.ride.update({
        where: { id: booking.rideId },
        data: {
          availableSeats: Math.min(newAvailable, ride.totalSeats),
          status:
            newAvailable > 0 && ride.status === "FULL" ? "OPEN" : ride.status,
        },
      });
    });

    const updated = await prisma.booking.findUniqueOrThrow({
      where: { id },
      include: {
        ride: { include: { driver: { select: { id: true, name: true } } } },
        passenger: { select: { id: true, name: true } },
      },
    });

    res.json({ data: serializeBookingList(updated) });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/cancel
 *
 * Passenger-initiated cancellation. Restores ride seat availability in a transaction.
 * Only PENDING or CONFIRMED bookings can be cancelled.
 */
export async function cancelBooking(
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

    const body = CancelBookingSchema.parse(req.body);
    const updated = await prisma.$transaction(async (tx) => {
      const booking = (await tx.booking.findUnique({
        where: { id },
        include: {
          ride: {
            select: {
              id: true,
              departureTime: true,
              availableSeats: true,
              totalSeats: true,
              status: true,
            },
          },
        },
      })) as any;

      if (!booking) {
        throw new AppError("NOT_FOUND", "Booking not found", 404);
      }
      if (booking.passengerId !== userId) {
        throw new AppError(
          "FORBIDDEN",
          "You can only cancel your own booking",
          403,
        );
      }
      if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
        throw new AppError(
          "INVALID_STATE",
          "This booking cannot be cancelled",
          409,
        );
      }

      const refundResult = getCancellationRefundResult(
        booking.ride.departureTime,
        new Prisma.Decimal(booking.totalFare.toString()),
      );
      const refundCapture = await payments.refund({
        bookingId: booking.id,
        providerPaymentId: booking.stripePaymentIntentId,
        amount: refundResult.refundAmount,
        reason: "PASSENGER_CANCELLATION",
      });

      // Update booking status to CANCELLED
      await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          refundedAmount: refundResult.refundAmount,
          refundedAt: refundCapture.refundedAt,
          paymentStatus: refundCapture.status,
          messageToDriver: body.reason ?? booking.messageToDriver,
        } as any,
      });

      // Restore seats (PENDING and CONFIRMED bookings hold seats)
      const ride = booking.ride;
      const newAvailable = Math.min(
        ride.availableSeats + booking.seatsBooked,
        ride.totalSeats,
      );
      await tx.ride.update({
        where: { id: booking.rideId },
        data: {
          availableSeats: newAvailable,
          status:
            newAvailable > 0 && ride.status === "FULL" ? "OPEN" : ride.status,
        },
      });
      const updatedBooking = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: {
          ride: { include: { driver: { select: { id: true, name: true } } } },
          passenger: { select: { id: true, name: true } },
        },
      });

      return {
        booking: updatedBooking,
      };
    });

    try {
      await emailQueue.bookingCancelled(updated.booking.id);
    } catch (queueErr) {
      console.error("[bookings/cancel] bookingCancelled queue failed", {
        bookingId: updated.booking.id,
        error: queueErr,
      });
    }

    res.json({
      data: {
        ...serializeBookingList(updated.booking),
        ...buildPaymentSnapshot(updated.booking),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/picked-up
 *
 * Driver marks a confirmed passenger as picked up after the ride has started.
 */
export async function markBookingPickedUp(
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

    UpdateBookingCheckpointSchema.parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const booking = (await tx.booking.findUnique({
        where: { id },
        include: {
          ride: { select: { driverId: true, status: true } },
        },
      })) as any;

      if (!booking) {
        throw new AppError("NOT_FOUND", "Booking not found", 404);
      }
      if (booking.ride.driverId !== userId) {
        throw new AppError(
          "FORBIDDEN",
          "Only the driver can mark passengers as picked up",
          403,
        );
      }
      if (booking.status !== "CONFIRMED") {
        throw new AppError(
          "INVALID_STATE",
          "Only confirmed bookings can be marked as picked up",
          409,
        );
      }

      await tx.booking.update({
        where: { id },
        data: {
          checkedInAt: booking.checkedInAt ?? new Date(),
          pickedUpAt: new Date(),
        } as any,
      });

      return tx.booking.findUniqueOrThrow({
        where: { id },
        include: {
          ride: { include: { driver: { select: { id: true, name: true } } } },
          passenger: { select: { id: true, name: true } },
        },
      });
    });

    res.json({
      data: {
        ...serializeBookingList(updated),
        ...buildPaymentSnapshot(updated),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/no-show
 *
 * Driver marks a passenger as a no-show. Refund remains zero by default.
 */
export async function markBookingNoShow(
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

    UpdateBookingCheckpointSchema.parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const booking = (await tx.booking.findUnique({
        where: { id },
        include: {
          ride: {
            select: {
              id: true,
              driverId: true,
              availableSeats: true,
              totalSeats: true,
              status: true,
            },
          },
        },
      })) as any;

      if (!booking) {
        throw new AppError("NOT_FOUND", "Booking not found", 404);
      }
      if (booking.ride.driverId !== userId) {
        throw new AppError(
          "FORBIDDEN",
          "Only the driver can mark a passenger as a no-show",
          403,
        );
      }
      if (booking.status !== "CONFIRMED") {
        throw new AppError(
          "INVALID_STATE",
          "Only confirmed bookings can be marked as a no-show",
          409,
        );
      }

      const refundCapture = await payments.refund({
        bookingId: booking.id,
        providerPaymentId: booking.stripePaymentIntentId,
        amount: new Prisma.Decimal(0),
        reason: "NO_SHOW",
      });

      await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          noShowMarkedAt: new Date(),
          refundedAmount: new Prisma.Decimal(0),
          refundedAt: refundCapture.refundedAt,
          paymentStatus: refundCapture.status,
        } as any,
      });

      const newAvailable = Math.min(
        booking.ride.availableSeats + booking.seatsBooked,
        booking.ride.totalSeats,
      );
      await tx.ride.update({
        where: { id: booking.ride.id },
        data: {
          availableSeats: newAvailable,
          status:
            newAvailable > 0 && booking.ride.status === "FULL"
              ? "OPEN"
              : booking.ride.status,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id },
        include: {
          ride: { include: { driver: { select: { id: true, name: true } } } },
          passenger: { select: { id: true, name: true } },
        },
      });
    });

    res.json({
      data: {
        ...serializeBookingList(updated),
        ...buildPaymentSnapshot(updated),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookings/earnings
 */
export async function getEarnings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }
    if (role !== "DRIVER") {
      throw new AppError(
        "FORBIDDEN",
        "Only approved drivers can view earnings",
        403,
      );
    }

    const rawPage = Array.isArray(req.query.page)
      ? req.query.page[0]
      : req.query.page;
    const rawLimit = Array.isArray(req.query.limit)
      ? req.query.limit[0]
      : req.query.limit;
    const parsedPage = Number(rawPage);
    const parsedLimit = Number(rawLimit);
    const page =
      Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 20;
    const skip = (page - 1) * limit;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfWeek = getStartOfWeek(new Date());

    const [
      platformFeePercent,
      approvedDriverProfile,
      thisWeekResult,
      thisMonthResult,
      totalCompletedCount,
      completedBookings,
    ] = await Promise.all([
      getPlatformFeePercent(),
      prisma.driverProfile.findFirst({
        where: { userId, status: "APPROVED" },
        select: { id: true },
      }),
      prisma.booking.aggregate({
        _sum: { driverEarnings: true },
        where: {
          status: "COMPLETED",
          ride: {
            driverId: userId,
            departureTime: { gte: startOfWeek },
          },
        },
      }),
      prisma.booking.aggregate({
        _sum: { driverEarnings: true },
        where: {
          status: "COMPLETED",
          ride: {
            driverId: userId,
            departureTime: { gte: startOfMonth },
          },
        },
      }),
      prisma.booking.count({
        where: {
          status: "COMPLETED",
          ride: { driverId: userId },
        },
      }),
      prisma.booking.findMany({
        where: {
          status: "COMPLETED",
          ride: { driverId: userId },
        },
        select: {
          id: true,
          totalFare: true,
          platformFee: true,
          driverEarnings: true,
          ride: {
            select: {
              id: true,
              departureTime: true,
              originAddress: true,
              destinationAddress: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    if (!approvedDriverProfile) {
      throw new AppError(
        "FORBIDDEN",
        "Only approved drivers can view earnings",
        403,
      );
    }

    res.json({
      data: {
        platformFeePercent: platformFeePercent.toString(),
        totals: {
          thisWeek: (
            thisWeekResult._sum.driverEarnings ?? new Prisma.Decimal(0)
          ).toString(),
          thisMonth: (
            thisMonthResult._sum.driverEarnings ?? new Prisma.Decimal(0)
          ).toString(),
          currency: "NOK",
        },
        rides: completedBookings.map((booking) => ({
          bookingId: booking.id,
          rideId: booking.ride.id,
          rideDate: booking.ride.departureTime.toISOString(),
          originAddress: booking.ride.originAddress,
          destinationAddress: booking.ride.destinationAddress,
          totalPrice: booking.totalFare.toString(),
          platformFee: booking.platformFee.toString(),
          driverPayout: booking.driverEarnings.toString(),
        })),
        pagination: {
          page,
          limit,
          total: totalCompletedCount,
          totalPages: Math.max(1, Math.ceil(totalCompletedCount / limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:id/complete
 *
 * Driver-initiated completion. Marks a CONFIRMED booking as COMPLETED after ride departs.
 * Only the driver who owns the ride can complete the booking.
 * Only CONFIRMED bookings can be completed (must have been accepted by driver).
 */
export async function completeBooking(
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

    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { ride: { select: { driverId: true, departureTime: true } } },
      });

      if (!booking) {
        throw new AppError("NOT_FOUND", "Booking not found", 404);
      }
      if (booking.ride.driverId !== userId) {
        throw new AppError(
          "FORBIDDEN",
          "Only the driver can complete this booking",
          403,
        );
      }
      if (booking.status !== "CONFIRMED") {
        throw new AppError(
          "INVALID_STATE",
          "Only confirmed bookings can be completed",
          409,
        );
      }

      // Optionally check if ride has already departed (for safety)
      const now = new Date();
      const departureTime = new Date(booking.ride.departureTime);
      if (now < departureTime) {
        throw new AppError(
          "INVALID_STATE",
          "Cannot complete booking before ride departure",
          409,
        );
      }

      await tx.booking.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      // Fetch updated booking for response
      return tx.booking.findUniqueOrThrow({
        where: { id },
        include: {
          ride: { include: { driver: { select: { id: true, name: true } } } },
          passenger: { select: { id: true, name: true } },
        },
      });
    });

    res.json({ data: serializeBookingList(updated) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bookings/:id/review
 */
export async function createReview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = CreateReviewSchema.parse(req.body);
    const { id } = req.params;

    void body;
    res.status(201).json({ message: "TODO: create review", bookingId: id });
  } catch (err) {
    next(err);
  }
}

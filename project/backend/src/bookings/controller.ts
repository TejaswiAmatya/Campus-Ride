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
import { notify } from "../lib/notify";

const PLATFORM_FEE_PERCENT = 0.1;
import { getPlatformFeePercent, getPlatformFeeRate } from "../config/service";
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

function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function serializeBookingList(b: any) {
  return {
    id: b.id,
    status: b.status,
    seatsBooked: b.seatsBooked,
    totalFare: b.totalFare.toString(),
    driverEarnings: b.driverEarnings.toString(),
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
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    passenger: b.passenger,
    review: b.review
      ? {
          id: b.review.id,
          rating: b.review.rating,
          comment: b.review.comment,
          createdAt: b.review.createdAt.toISOString(),
        }
      : null,
    ride: {
      id: b.ride.id,
      originAddress: b.ride.originAddress,
      destinationAddress: b.ride.destinationAddress,
      departureTime: b.ride.departureTime.toISOString(),
      status: b.ride.status,
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
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    passenger: {
      id: b.passenger.id,
      name: b.passenger.name,
      avatarUrl: b.passenger.avatarPath ?? null,
    },
    review: b.review
      ? {
          id: b.review.id,
          rating: b.review.rating,
          comment: b.review.comment,
          createdAt: b.review.createdAt.toISOString(),
          reviewerId: b.review.reviewerId,
          revieweeId: b.review.revieweeId,
        }
      : null,
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

async function findBookingReview(
  client: typeof prisma,
  booking: {
    rideId: string;
    passengerId: string;
    ride: { driver: { id: string } };
  },
) {
  return client.review.findFirst({
    where: {
      rideId: booking.rideId,
      OR: [
        {
          reviewerId: booking.passengerId,
          revieweeId: booking.ride.driver.id,
        },
        {
          reviewerId: booking.ride.driver.id,
          revieweeId: booking.passengerId,
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
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

function getCancellationRefundResult(
  departureTime: Date,
  totalFare: Prisma.Decimal,
): {
  refundAmount: Prisma.Decimal;
  paymentStatus: string;
  policyWindow: "FREE" | "PARTIAL" | "NO_REFUND";
} {
  const now = new Date();
  const millisecondsUntilDeparture = departureTime.getTime() - now.getTime();
  const twoHoursInMs = 2 * 60 * 60 * 1000;

  if (millisecondsUntilDeparture > twoHoursInMs) {
    return {
      refundAmount: totalFare,
      paymentStatus: "REFUNDED",
      policyWindow: "FREE",
    };
  }

  if (millisecondsUntilDeparture > 0) {
    return {
      refundAmount: totalFare.mul(0.5),
      paymentStatus: "PARTIALLY_REFUNDED",
      policyWindow: "PARTIAL",
    };
  }

  return {
    refundAmount: new Prisma.Decimal(0),
    paymentStatus: "PAID",
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

        const review = await findBookingReview(prisma, booking as any);

        res.status(201).json({
          data: {
            ...serializeBookingList({ ...booking, review }),
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
      const bookingsWithReviews = await Promise.all(
        bookings.map(async (booking) => ({
          ...booking,
          review: await findBookingReview(prisma, booking as any),
        })),
      );
      res.json({ data: bookingsWithReviews.map(serializeBookingList) });
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
    const bookingsWithReviews = await Promise.all(
      bookings.map(async (booking) => ({
        ...booking,
        review: await findBookingReview(prisma, booking as any),
      })),
    );
    res.json({ data: bookingsWithReviews.map(serializeBookingList) });
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

    const review = await findBookingReview(prisma, booking as any);
    res.json({ data: serializeBookingDetail({ ...booking, review }) });
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
    let updated: any = null;

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

    updated = { ...updated, review: await findBookingReview(prisma, updated) };

    await notify.bookingStatus(updated.passenger.id, {
      bookingId: updated.id,
      status: "confirmed",
      updatedAt: new Date().toISOString(),
    });
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
    const review = await findBookingReview(prisma, updated as any);

    await notify.bookingStatus(updated.passenger.id, {
      bookingId: updated.id,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    });

    res.json({ data: serializeBookingList({ ...updated, review }) });
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

      // Update booking status to CANCELLED
      await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          refundedAmount: refundResult.refundAmount,
          refundedAt:
            refundResult.refundAmount.gt(0) ? new Date() : booking.refundedAt,
          paymentStatus: refundResult.paymentStatus,
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
        refundPolicy: refundResult.policyWindow,
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

    const cancelReview = await findBookingReview(prisma, updated.booking as any);

    await notify.bookingStatus(updated.booking.passenger.id, {
      bookingId: updated.booking.id,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    });

    res.json({
      data: {
        ...serializeBookingList({ ...updated.booking, review: cancelReview }),
        ...buildPaymentSnapshot(updated.booking),
        cancellation: {
          policyApplied: updated.refundPolicy,
          cutoffHours: 2,
        },
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

      await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          noShowMarkedAt: new Date(),
          refundedAmount: new Prisma.Decimal(0),
          paymentStatus: "PAID",
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
        cancellation: {
          policyApplied: "NO_REFUND",
          cutoffHours: 2,
        },
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

    const completedReview = await findBookingReview(prisma, updated as any);

    await notify.bookingStatus(updated.passenger.id, {
      bookingId: updated.id,
      status: "completed",
      updatedAt: new Date().toISOString(),
    });

    res.json({ data: serializeBookingList({ ...updated, review: completedReview }) });
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
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }
    if (body.bookingId !== id) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Booking id in payload must match the route parameter",
        422,
      );
    }

    const review = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: {
          ride: { select: { id: true, driverId: true } },
        },
      });

      if (!booking) {
        throw new AppError("NOT_FOUND", "Booking not found", 404);
      }
      if (booking.status !== "COMPLETED") {
        throw new AppError(
          "INVALID_STATE",
          "A review can only be left after the ride is completed",
          409,
        );
      }
      const revieweeId =
        booking.ride.driverId === userId
          ? booking.passengerId
          : booking.ride.driverId;

      const existingReview = await tx.review.findFirst({
        where: {
          rideId: booking.rideId,
          reviewerId: userId,
          revieweeId,
        },
      });

      if (existingReview) {
        throw new AppError(
          "INVALID_STATE",
          "A review has already been submitted for this booking",
          409,
        );
      }

      const isDriver = booking.ride.driverId === userId;
      const isPassenger = booking.passengerId === userId;
      if (!isDriver && !isPassenger) {
        throw new AppError(
          "FORBIDDEN",
          "Only the driver or passenger from this booking can leave a review",
          403,
        );
      }

      return tx.review.create({
        data: {
          rideId: booking.rideId,
          reviewerId: userId,
          revieweeId,
          rating: body.rating,
          comment: body.comment,
        },
      });
    });

    res.status(201).json({
      data: {
        id: review.id,
        bookingId: id,
        rating: review.rating,
        comment: review.comment,
        reviewerId: review.reviewerId,
        revieweeId: review.revieweeId,
        createdAt: review.createdAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

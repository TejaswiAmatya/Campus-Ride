import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { CreateBookingSchema, CreateReviewSchema } from './schemas'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/error'
import { emailQueue } from '../lib/emailQueue'

const PLATFORM_FEE_PERCENT = 0.1

function isSerializationFailure(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2034'
}

function serializeBookingList(
  b: Prisma.BookingGetPayload<{
    include: {
      ride: { include: { driver: { select: { id: true; name: true } } } }
      passenger: { select: { id: true; name: true } }
    }
  }>,
) {
  return {
    id: b.id,
    status: b.status,
    seatsBooked: b.seatsBooked,
    totalFare: b.totalFare.toString(),
    createdAt: b.createdAt.toISOString(),
    passenger: b.passenger,
    ride: {
      id: b.ride.id,
      originAddress: b.ride.originAddress,
      destinationAddress: b.ride.destinationAddress,
      departureTime: b.ride.departureTime.toISOString(),
      driver: { id: b.ride.driver.id, name: b.ride.driver.name },
    },
  }
}

function serializeBookingDetail(
  b: Prisma.BookingGetPayload<{
    include: {
      ride: { include: { driver: { select: { id: true; name: true; avatarPath: true } } } }
      passenger: { select: { id: true; name: true; avatarPath: true } }
    }
  }>,
) {
  return {
    id: b.id,
    status: b.status,
    seatsBooked: b.seatsBooked,
    totalFare: b.totalFare.toString(),
    platformFee: b.platformFee.toString(),
    driverEarnings: b.driverEarnings.toString(),
    paymentStatus: b.paymentStatus,
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
  }
}

/**
 * POST /api/bookings
 *
 * Serializable transaction: re-check seats, create booking, decrement seats.
 */
export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = CreateBookingSchema.parse(req.body)
    const passengerId = req.user?.id
    if (!passengerId) {
      throw new AppError('UNAUTHORIZED', 'Not authenticated', 401)
    }

    const maxAttempts = 5

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
              },
            })

            if (!ride) {
              throw new AppError('NOT_FOUND', 'Ride not found', 404)
            }
            if (ride.driverId === passengerId) {
              throw new AppError('FORBIDDEN', 'You cannot book your own ride', 403)
            }
            if (ride.status !== 'OPEN') {
              throw new AppError('RIDE_NOT_OPEN', 'This ride is not accepting bookings', 409)
            }
            if (ride.availableSeats < body.seatsBooked) {
              throw new AppError('SEATS_UNAVAILABLE', 'Not enough seats available', 409)
            }

            const pricePerSeat = new Prisma.Decimal(ride.pricePerSeat.toString())
            const totalFare = pricePerSeat.mul(body.seatsBooked)
            const platformFee = totalFare.mul(new Prisma.Decimal(PLATFORM_FEE_PERCENT.toString()))
            const driverEarnings = totalFare.sub(platformFee)

            const created = await tx.booking.create({
              data: {
                rideId: ride.id,
                passengerId,
                seatsBooked: body.seatsBooked,
                totalFare,
                platformFee,
                driverEarnings,
                status: 'PENDING',
              },
              include: {
                ride: { include: { driver: { select: { id: true, name: true } } } },
                passenger: { select: { id: true, name: true } },
              },
            })

            const newAvailable = ride.availableSeats - body.seatsBooked
            await tx.ride.update({
              where: { id: ride.id },
              data: {
                availableSeats: newAvailable,
                status: newAvailable === 0 ? 'FULL' : 'OPEN',
              },
            })

            return created
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        )

        res.status(201).json({ data: serializeBookingList(booking) })
        return
      } catch (err) {
        if (isSerializationFailure(err)) {
          continue
        }
        next(err)
        return
      }
    }

    next(
      new AppError(
        'BOOKING_CONFLICT',
        'Could not complete booking due to high demand. Please try again.',
        409,
      ),
    )
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/bookings
 */
export async function listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Not authenticated', 401)
    }

    const asDriver = req.query.asDriver === 'true'

    if (asDriver) {
      const bookings = await prisma.booking.findMany({
        where: { ride: { driverId: userId } },
        include: {
          passenger: { select: { id: true, name: true } },
          ride: { include: { driver: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      })
      res.json({ data: bookings.map(serializeBookingList) })
      return
    }

    const bookings = await prisma.booking.findMany({
      where: { passengerId: userId },
      include: {
        passenger: { select: { id: true, name: true } },
        ride: { include: { driver: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ data: bookings.map(serializeBookingList) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/bookings/:id
 */
export async function getBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.id
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Not authenticated', 401)
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        ride: { include: { driver: { select: { id: true, name: true, avatarPath: true } } } },
        passenger: { select: { id: true, name: true, avatarPath: true } },
      },
    })

    if (!booking) {
      throw new AppError('NOT_FOUND', 'Booking not found', 404)
    }

    const isPassenger = booking.passengerId === userId
    const isDriver = booking.ride.driverId === userId
    if (!isPassenger && !isDriver) {
      throw new AppError('FORBIDDEN', 'You cannot view this booking', 403)
    }

    res.json({ data: serializeBookingDetail(booking) })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/bookings/:id/confirm
 */
export async function confirmBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.id
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Not authenticated', 401)
    }

    const maxRetries = 3
    let updated: Prisma.BookingGetPayload<{
      include: {
        ride: { include: { driver: { select: { id: true; name: true } } } }
        passenger: { select: { id: true; name: true } }
      }
    }>

    for (let attempt = 1; ; attempt += 1) {
      try {
        updated = await prisma.$transaction(
          async (tx) => {
            const booking = await tx.booking.findUnique({
              where: { id },
              include: { ride: { select: { driverId: true } } },
            })

            if (!booking) {
              throw new AppError('NOT_FOUND', 'Booking not found', 404)
            }
            if (booking.ride.driverId !== userId) {
              throw new AppError('FORBIDDEN', 'Only the driver can confirm this booking', 403)
            }

            const result = await tx.booking.updateMany({
              where: { id, status: 'PENDING' },
              data: { status: 'CONFIRMED' },
            })

            if (result.count === 0) {
              throw new AppError('INVALID_STATE', 'Only pending bookings can be confirmed', 409)
            }

            const confirmedBooking = await tx.booking.findUnique({
              where: { id },
              include: {
                ride: { include: { driver: { select: { id: true, name: true } } } },
                passenger: { select: { id: true, name: true } },
              },
            })

            if (!confirmedBooking) {
              throw new AppError('NOT_FOUND', 'Booking not found', 404)
            }

            return confirmedBooking
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        )
        break
      } catch (err) {
        if (attempt < maxRetries && isSerializationFailure(err)) {
          continue
        }
        throw err
      }
    }

    res.json({ data: serializeBookingList(updated) })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/bookings/:id/decline
 */
export async function declineBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.id
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Not authenticated', 401)
    }

    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { ride: { select: { driverId: true, id: true } } },
      })

      if (!booking) {
        throw new AppError('NOT_FOUND', 'Booking not found', 404)
      }
      if (booking.ride.driverId !== userId) {
        throw new AppError('FORBIDDEN', 'Only the driver can decline this booking', 403)
      }
      if (booking.status !== 'PENDING') {
        throw new AppError('INVALID_STATE', 'Only pending bookings can be declined', 409)
      }

      await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      })

      const ride = await tx.ride.findUniqueOrThrow({
        where: { id: booking.rideId },
        select: { availableSeats: true, totalSeats: true, status: true },
      })

      const newAvailable = ride.availableSeats + booking.seatsBooked
      await tx.ride.update({
        where: { id: booking.rideId },
        data: {
          availableSeats: Math.min(newAvailable, ride.totalSeats),
          status: newAvailable > 0 && ride.status === 'FULL' ? 'OPEN' : ride.status,
        },
      })
    })

    const updated = await prisma.booking.findUniqueOrThrow({
      where: { id },
      include: {
        ride: { include: { driver: { select: { id: true, name: true } } } },
        passenger: { select: { id: true, name: true } },
      },
    })

    res.json({ data: serializeBookingList(updated) })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/bookings/:id/cancel
 */
export async function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.id
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Not authenticated', 401)
    }

    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { ride: { select: { id: true } } },
      })

      if (!booking) {
        throw new AppError('NOT_FOUND', 'Booking not found', 404)
      }
      if (booking.passengerId !== userId) {
        throw new AppError('FORBIDDEN', 'You can only cancel your own booking', 403)
      }
      if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
        throw new AppError('INVALID_STATE', 'This booking cannot be cancelled', 409)
      }

      const wasHoldingSeats = booking.status === 'PENDING' || booking.status === 'CONFIRMED'

      await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      })

      if (wasHoldingSeats) {
        const ride = await tx.ride.findUniqueOrThrow({
          where: { id: booking.rideId },
          select: { availableSeats: true, totalSeats: true, status: true },
        })
        const newAvailable = Math.min(ride.availableSeats + booking.seatsBooked, ride.totalSeats)
        await tx.ride.update({
          where: { id: booking.rideId },
          data: {
            availableSeats: newAvailable,
            status: newAvailable > 0 && ride.status === 'FULL' ? 'OPEN' : ride.status,
          },
        })
      }
    })

    const updated = await prisma.booking.findUniqueOrThrow({
      where: { id },
      include: {
        ride: { include: { driver: { select: { id: true, name: true } } } },
        passenger: { select: { id: true, name: true } },
      },
    })

    try {
      await emailQueue.bookingCancelled(updated.id)
    } catch (queueErr) {
      console.error('[bookings/cancel] bookingCancelled queue failed', {
        bookingId: updated.id,
        error: queueErr,
      })
    }

    res.json({ data: serializeBookingList(updated) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/bookings/earnings
 */
export async function getEarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ message: 'TODO: get earnings', driverId: req.user?.id })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/bookings/:id/review
 */
export async function createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = CreateReviewSchema.parse(req.body)
    const { id } = req.params

    void body
    res.status(201).json({ message: 'TODO: create review', bookingId: id })
  } catch (err) {
    next(err)
  }
}

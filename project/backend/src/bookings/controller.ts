import type { Request, Response, NextFunction } from 'express'
import { CreateBookingSchema, UpdateBookingStatusSchema, CreateReviewSchema } from './schemas'
import { prisma } from '../lib/prisma'
import { notify } from '../socket'
import { AppError } from '../middleware/errorHandler'

const PLATFORM_FEE_PERCENT = 0.10 // 10% — move to Config table in Sprint 2

/**
 * POST /api/bookings
 *
 * Atomically:
 *   1. Re-read Ride.availableSeats inside a serializable transaction.
 *   2. Reject if not enough seats.
 *   3. Create the Booking record with fare split computed here.
 *   4. Decrement Ride.availableSeats.
 *   5. If seats reach 0, set Ride.status = FULL.
 *   6. Emit booking:new Socket.io event to the driver.
 *   7. Enqueue booking-confirmed email (after driver accepts).
 */
export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = CreateBookingSchema.parse(req.body)

    // TODO — serializable transaction prevents double-booking:
    // const booking = await prisma.$transaction(async (tx) => {
    //   const ride = await tx.ride.findUniqueOrThrow({ where: { id: body.rideId } })
    //   if (ride.status !== 'OPEN') throw new AppError('RIDE_NOT_OPEN', 'Ride is no longer accepting bookings', 409)
    //   if (ride.availableSeats < body.seatsBooked) throw new AppError('SEATS_UNAVAILABLE', 'Not enough seats available', 409)
    //
    //   const totalFare    = Number(ride.pricePerSeat) * body.seatsBooked
    //   const platformFee  = totalFare * PLATFORM_FEE_PERCENT
    //   const driverEarnings = totalFare - platformFee
    //
    //   const booking = await tx.booking.create({
    //     data: {
    //       rideId: body.rideId,
    //       passengerId: req.user!.sub,
    //       seatsBooked: body.seatsBooked,
    //       totalFare,
    //       platformFee,
    //       driverEarnings,
    //     },
    //   })
    //
    //   const newSeats = ride.availableSeats - body.seatsBooked
    //   await tx.ride.update({
    //     where: { id: body.rideId },
    //     data: {
    //       availableSeats: newSeats,
    //       status: newSeats === 0 ? 'FULL' : 'OPEN',
    //     },
    //   })
    //   return booking
    // }, { isolationLevel: 'Serializable' })
    //
    // notify.bookingNew(ride.driverId, { bookingId: booking.id, rideId: body.rideId, passengerName: ... })
    // res.status(201).json({ data: booking })

    void notify
    void prisma
    void AppError
    void PLATFORM_FEE_PERCENT
    res.status(201).json({ message: 'TODO: create booking', body })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/bookings
 *
 * Passenger: returns their booking history.
 * Driver: returns booking requests for their rides (pass ?asDriver=true).
 */
export async function listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // TODO:
    // const asDriver = req.query.asDriver === 'true'
    // if (asDriver) {
    //   // bookings on rides owned by this driver
    //   const bookings = await prisma.booking.findMany({
    //     where: { ride: { driverId: req.user!.sub } },
    //     include: { passenger: { select: { id: true, name: true, avatarUrl: true } }, ride: true },
    //     orderBy: { createdAt: 'desc' },
    //   })
    //   res.json({ data: bookings })
    // } else {
    //   const bookings = await prisma.booking.findMany({
    //     where: { passengerId: req.user!.sub },
    //     include: { ride: { include: { driver: { select: { id: true, name: true } } } } },
    //     orderBy: { createdAt: 'desc' },
    //   })
    //   res.json({ data: bookings })
    // }

    res.json({ message: 'TODO: list bookings', userId: req.user?.sub })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/bookings/:id
 *
 * Returns full booking detail. Accessible by the passenger or the ride driver.
 */
export async function getBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    // TODO: fetch + authorise (passenger or driver)
    res.json({ message: 'TODO: get booking', bookingId: id })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/bookings/:id/confirm
 *
 * Driver confirms a pending booking.
 * Emits booking:status event to the passenger.
 * Enqueues a booking-confirmed email.
 */
export async function confirmBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    // TODO: verify req.user is the ride's driver, set status = CONFIRMED
    // notify.bookingStatus(booking.passengerId, { bookingId: id, status: 'CONFIRMED' })
    // await emailQueue.add('booking-confirmed', { recipientEmail: passenger.email, payload: { bookingId: id } })

    res.json({ message: 'TODO: confirm booking', bookingId: id })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/bookings/:id/decline
 *
 * Driver declines a pending booking.
 * Restores Ride.availableSeats and emits booking:status to the passenger.
 */
export async function declineBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    // TODO: verify driver, set status = CANCELLED, restore seats

    res.json({ message: 'TODO: decline booking', bookingId: id })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/bookings/:id/cancel
 *
 * Passenger cancels their own booking.
 * Restores seats on the ride.
 * Sprint 3: trigger Stripe refund if payment was completed.
 */
export async function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    // TODO: verify passenger, check cancellation window, restore seats, optionally refund

    res.json({ message: 'TODO: cancel booking', bookingId: id })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/bookings/earnings
 *
 * Driver earnings history: sum of driverEarnings grouped by month/ride.
 */
export async function getEarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // TODO:
    // const earnings = await prisma.booking.aggregate({
    //   where: { ride: { driverId: req.user!.sub }, status: 'COMPLETED' },
    //   _sum: { driverEarnings: true },
    //   _count: true,
    // })
    // res.json({ data: earnings })

    res.json({ message: 'TODO: get earnings', driverId: req.user?.sub })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/bookings/:id/review
 *
 * Passenger reviews the driver after a COMPLETED booking.
 * One review per booking (enforced by DB unique constraint on Review.bookingId).
 */
export async function createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = CreateReviewSchema.parse(req.body)
    const { id } = req.params

    // TODO: verify booking is COMPLETED and belongs to req.user, create review

    res.status(201).json({ message: 'TODO: create review', bookingId: id, body })
  } catch (err) {
    next(err)
  }
}

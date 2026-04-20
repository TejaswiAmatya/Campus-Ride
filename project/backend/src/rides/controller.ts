import type { Request, Response, NextFunction } from 'express'
import { CreateRideSchema, SearchRidesSchema, UpdateRideStatusSchema } from './schemas'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/error'

/**
 * POST /api/rides
 *
 * Authenticated driver creates a ride offer.
 * Sets availableSeats = totalSeats initially.
 * Requires user.isDriverApproved = true.
 */
export async function createRide(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = CreateRideSchema.parse(req.body)

    // TODO:
    // const driver = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } })
    // if (!driver.isDriverApproved) throw new AppError('FORBIDDEN', 'Driver application not yet approved', 403)
    //
    // const ride = await prisma.ride.create({
    //   data: {
    //     driverId: req.user!.sub,
    //     ...body,
    //     departureTime: new Date(body.departureTime),
    //     availableSeats: body.totalSeats,
    //   },
    // })
    // res.status(201).json({ data: ride })

    // TODO: add notifications later
    res.status(201).json({ message: 'TODO: create ride', body })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/rides
 *
 * Public search. Filters by date, text address match, available seats.
 * Sprint 2: replace text match with PostGIS bounding-box proximity query.
 *
 * Query params: origin, destination, date (YYYY-MM-DD), seats, originLat, originLng, radiusKm
 */
export async function searchRides(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = SearchRidesSchema.parse(req.query)

    // TODO:
    // const where: Prisma.RideWhereInput = {
    //   status: 'OPEN',
    //   availableSeats: { gte: query.seats ?? 1 },
    //   ...(query.date && {
    //     departureTime: {
    //       gte: new Date(query.date),
    //       lt: new Date(new Date(query.date).getTime() + 86_400_000),
    //     },
    //   }),
    //   ...(query.origin && { originAddress: { contains: query.origin, mode: 'insensitive' } }),
    //   ...(query.destination && { destinationAddress: { contains: query.destination, mode: 'insensitive' } }),
    // }
    // const rides = await prisma.ride.findMany({
    //   where,
    //   include: { driver: { select: { id: true, name: true, avatarUrl: true } } },
    //   orderBy: { departureTime: 'asc' },
    // })
    // res.json({ data: rides })

    res.json({ message: 'TODO: search rides', query })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/rides/mine
 *
 * Returns all rides posted by the authenticated driver, with booking counts.
 */
export async function getMyRides(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // TODO:
    // const rides = await prisma.ride.findMany({
    //   where: { driverId: req.user!.sub },
    //   include: { _count: { select: { bookings: true } } },
    //   orderBy: { departureTime: 'desc' },
    // })
    // res.json({ data: rides })

    res.json({ message: 'TODO: get my rides', driverId: req.user?.sub })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/rides/:id
 *
 * Returns ride detail including driver profile and all bookings (for the driver).
 * Passengers see only seat availability, not other passengers' info.
 */
export async function getRide(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    // TODO:
    // const ride = await prisma.ride.findUniqueOrThrow({
    //   where: { id },
    //   include: {
    //     driver: { select: { id: true, name: true, avatarUrl: true } },
    //     vehicle: true,
    //   },
    // })
    // res.json({ data: ride })

    res.json({ message: 'TODO: get ride detail', rideId: id })
  } catch (err) {
    next(err)
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
export async function updateRideStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    const body = UpdateRideStatusSchema.parse(req.body)

    // TODO:
    // const ride = await prisma.ride.findUniqueOrThrow({ where: { id } })
    // if (ride.driverId !== req.user!.sub) throw new AppError('FORBIDDEN', 'Not the driver of this ride', 403)
    // const updated = await prisma.ride.update({ where: { id }, data: { status: body.status } })
    //
    // notify.rideStatus(id, { status: body.status, updatedAt: new Date().toISOString() })
    // res.json({ data: updated })

    void AppError
    res.json({ message: 'TODO: update ride status', rideId: id, status: body.status })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/rides/:id
 *
 * Soft-cancel: sets status = CANCELLED.
 * Only allowed if no confirmed bookings exist and departure hasn't passed.
 */
export async function cancelRide(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    // TODO: check ownership, check no confirmed bookings, set status = CANCELLED
    // Cancel all pending bookings and refund if Stripe is integrated

    res.json({ message: 'TODO: cancel ride', rideId: id })
  } catch (err) {
    next(err)
  }
}

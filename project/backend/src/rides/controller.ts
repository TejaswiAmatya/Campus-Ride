import type { Request, Response, NextFunction } from 'express'
import { DriverStatus } from '@prisma/client'
import { CreateRideSchema, SearchRidesSchema, UpdateRideStatusSchema } from './schemas'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/error'
import { mapDriverForApi, serializeRideList } from './serialize'

/**
 * POST /api/rides
 *
 * Authenticated driver creates a ride offer.
 * Sets availableSeats = totalSeats initially.
 * Requires role DRIVER and driverProfile.status = APPROVED.
 */
export async function createRide(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = CreateRideSchema.parse(req.body)
    const driverId = req.user?.id

    if (!driverId) {
      throw new AppError('UNAUTHORIZED', 'Not authenticated', 401)
    }

    const driver = await prisma.user.findUniqueOrThrow({
      where: { id: driverId },
      select: {
        role: true,
        driverProfile: { select: { status: true } },
      },
    })

    if (driver.role !== 'DRIVER' || driver.driverProfile?.status !== DriverStatus.APPROVED) {
      throw new AppError('FORBIDDEN', 'Driver application not yet approved', 403)
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
    })

    res.status(201).json({ data: serializeRideList(ride) })
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
    const where = {
      status: 'OPEN' as const,
      ...(query.date && {
        departureTime: {
          gte: new Date(`${query.date}T00:00:00.000Z`),
          lt: new Date(`${query.date}T23:59:59.999Z`),
        },
      }),
      ...(query.location && {
        OR: [
          { originAddress: { contains: query.location, mode: 'insensitive' as const } },
          { destinationAddress: { contains: query.location, mode: 'insensitive' as const } },
        ],
      }),
    }

    const rides = await prisma.ride.findMany({
      where,
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
      orderBy: { departureTime: 'asc' },
    })

    res.json({ data: rides.map(serializeRideList) })
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
    if (!req.user?.id) {
      throw new AppError('UNAUTHORIZED', 'Not authenticated', 401)
    }

    const rides = await prisma.ride.findMany({
      where: { driverId: req.user.id },
      include: { _count: { select: { bookings: true } } },
      orderBy: { departureTime: 'desc' },
    })

    res.json({ data: rides })
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
    })

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
    })
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
    // if (ride.driverId !== req.user!.id) throw new AppError('FORBIDDEN', 'Not the driver of this ride', 403)
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

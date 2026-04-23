// cspell:words supabase
import type { Request, Response, NextFunction } from 'express'
import {
  UpdateProfileSchema,
  DriverApplicationSchema,
  type DriverApplicationInput,
} from './schemas'
import { prisma } from '../lib/prisma'
import { uploadLicense } from '../lib/supabase'
import { AppError } from '../middleware/error'

/**
 * GET /api/users/me
 *
 * Returns the full profile of the currently authenticated user,
 * including their driver application profile if present.
 */
export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      })
      return
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user.id },
      include: { driverProfile: true },
    })

    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/users/me
 *
 * Updates name, phone, or avatarPath. Avatar upload to Supabase Storage
 * is handled client-side; this endpoint receives the resulting URL.
 */
export async function updateCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = UpdateProfileSchema.parse(req.body)

    // TODO: prisma.user.update({ where: { id: req.user!.id }, data: body })

    res.json({ message: 'TODO: update profile', updates: body })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/users/me/driver
 * Uploads a driver license and creates a pending driver application.
 */
export async function applyAsDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Multer keeps the file in req.file
    if (!req.file) {
      throw new AppError('MISSING_FILE', 'License file is required', 400)
    }

    const body: DriverApplicationInput = DriverApplicationSchema.parse(req.body)

    const existingApplication = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.id },
    })
    if (existingApplication) {
      throw new AppError('DRIVER_APPLICATION_EXISTS', 'You already have a driver application', 409)
    }

    const licencePath = await uploadLicense(req.user!.id, req.file.buffer, req.file.mimetype)

    const driverProfile = await prisma.driverProfile.create({
      data: {
        userId: req.user!.id,
        licencePath,
        vehicleInfo: body.vehicle,
        status: 'PENDING',
      },
    })

    res.status(201).json({ data: driverProfile })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/users/:id/reviews
 *
 * Returns paginated reviews for a driver profile (publicly accessible).
 */
export async function getDriverReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params

    // TODO:
    // const reviews = await prisma.review.findMany({
    //   where: { revieweeId: id },
    //   include: { reviewer: { select: { id: true, name: true, avatarUrl: true } } },
    //   orderBy: { createdAt: 'desc' },
    // })
    // res.json({ data: reviews })

    res.json({ message: 'TODO: get driver reviews', driverId: id })
  } catch (err) {
    next(err)
  }
}

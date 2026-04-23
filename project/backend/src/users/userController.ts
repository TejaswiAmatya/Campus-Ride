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
 * including their vehicle info if they are a driver.
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
      include: { vehicle: true },
    })

    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/users/me
 *
 * Updates name, phone, or avatarUrl. Avatar upload to Supabase Storage
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
 * Uploads a driver license and creates or updates the User's Vehicle record.
 */
export async function applyAsDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Multer keeps the file in req.file
    if (!req.file) {
      throw new AppError('MISSING_FILE', 'License file is required', 400)
    }

    const body: DriverApplicationInput = DriverApplicationSchema.parse({
      vehicle: parseVehicleField(req.body.vehicle),
    })

    // Guard against already being a driver
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { userId: req.user!.id },
    })
    if (existingVehicle) {
      throw new AppError('DRIVER_ALREADY_EXISTS', 'You are already a driver', 409)
    }

    // Upload to Supabase, get file path
    const filePath = await uploadLicense(req.user!.id, req.file.buffer, req.file.mimetype)

    const [updatedUser, vehicle] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user!.id },
        data: { role: 'DRIVER', isDriverApproved: false, licensePath: filePath },
      }),
      prisma.vehicle.upsert({
        where: { userId: req.user!.id },
        create: { userId: req.user!.id, ...body.vehicle },
        update: { ...body.vehicle },
      }),
    ])

    res.status(201).json({
      message: 'Your application is under review',
      user: {
        id: updatedUser.id,
        role: updatedUser.role,
        isDriverApproved: updatedUser.isDriverApproved,
      },
      vehicle,
    })
  } catch (err) {
    next(err)
  }
}

function parseVehicleField(rawVehicle: unknown): DriverApplicationInput['vehicle'] {
  if (typeof rawVehicle !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'vehicle must be a JSON string', 422)
  }

  try {
    return JSON.parse(rawVehicle) as DriverApplicationInput['vehicle']
  } catch {
    throw new AppError('VALIDATION_ERROR', 'vehicle must be valid JSON', 422)
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

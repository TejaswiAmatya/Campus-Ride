// cspell:words supabase
import type { Request, Response, NextFunction } from 'express'
import {
  UpdateProfileSchema,
  DriverApplicationSchema,
} from './schemas'
import { prisma } from '../lib/prisma'

/**
 * GET /api/users/me
 *
 * Returns the full profile of the currently authenticated user,
 * including their vehicle info if they are a driver.
 */
export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      })
      return
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user.sub },
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

    // TODO: prisma.user.update({ where: { id: req.user!.sub }, data: body })

    res.json({ message: 'TODO: update profile', updates: body })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/users/me/driver
 *
 * Submits a driver application:
 * 1. Validates licence URL (must already be uploaded to Supabase Storage).
 * 2. Creates or updates the User's Vehicle record.
 * 3. Sets User.role = DRIVER, User.isDriverApproved = false.
 * 4. Admin reviews the application at GET /api/admin/drivers/pending.
 */
export async function applyAsDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = DriverApplicationSchema.parse(req.body)

    // TODO:
    // await prisma.$transaction([
    //   prisma.user.update({
    //     where: { id: req.user!.sub },
    //     data: { role: 'DRIVER', isDriverApproved: false, licenceUrl: body.licenceUrl },
    //   }),
    //   prisma.vehicle.upsert({
    //     where: { userId: req.user!.sub },
    //     create: { userId: req.user!.sub, ...body.vehicle },
    //     update: { ...body.vehicle },
    //   }),
    // ])

    res.status(201).json({ message: 'TODO: submit driver application', userId: req.user?.sub, body })
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

// cspell:words supabase
import type { Request, Response, NextFunction } from 'express'
import {
  RegisterSchema,
  LoginSchema,
  UpdateProfileSchema,
  DriverApplicationSchema,
} from './schemas'
import { prisma } from '../lib/prisma'
import { supabaseAdmin } from '../lib/supabase'

// POST /api/users/register
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = RegisterSchema.parse(req.body)

    // create Supabase auth user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    })
    if (error || !data?.user) {
      res.status(500).json({error: error?.message,
        message: 'User not created',})
      return
    }
    
    // create new user
    const user = await prisma.user.create({
      data: { id: data.user.id, email: body.email, name: body.name, phone: body.phone },
    })

    // TODO: enqueue welcome email
    // await emailQueue.add('welcome', { recipientEmail: body.email, payload: { name: body.name } })

    res.status(201).json({ message: 'TODO: register user', email: body.email })
  } catch (err) {
    next(err)
  }
}

// POST /api/users/login
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // validate the request body
    const body = LoginSchema.parse(req.body)

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    // Invalid credentials
    if (error || !data?.session) {
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
      })
      return
    }

    // return the access_token and refresh_token
    const session = data.session
    res.status(200).json({
      data: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/users/me
 *
 * Returns the full profile of the currently authenticated user,
 * including their vehicle info if they are a driver.
 */
export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // TODO: fetch from Prisma
    // const user = await prisma.user.findUniqueOrThrow({
    //   where: { id: req.user!.sub },
    //   include: { vehicle: true },
    // })
    // res.json({ data: user })

    res.json({ message: 'TODO: get own profile', userId: req.user?.sub })
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

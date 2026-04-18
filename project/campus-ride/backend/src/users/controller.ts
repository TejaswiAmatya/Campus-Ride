import type { Request, Response, NextFunction } from 'express'
import {
  RegisterSchema,
  LoginSchema,
  UpdateProfileSchema,
  DriverApplicationSchema,
} from './schemas'
import { prisma } from '../lib/prisma'
import { supabaseAdmin } from '../lib/supabase'

/**
 * POST /api/users/register
 *
 * 1. Validate the request body (university email + strong password).
 * 2. Create a Supabase Auth user with supabaseAdmin.auth.admin.createUser().
 * 3. Create a corresponding Prisma User record using the Supabase user ID.
 * 4. Enqueue a "welcome" email job via BullMQ (Track D wires this up).
 * 5. Return the new user profile (never return the password).
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = RegisterSchema.parse(req.body)

    // TODO: create Supabase auth user
    // const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
    //   email: body.email,
    //   password: body.password,
    //   email_confirm: true,
    // })
    // if (error) throw new AppError('AUTH_ERROR', error.message)

    // TODO: create Prisma user using authData.user.id as the primary key
    // const user = await prisma.user.create({
    //   data: { id: authData.user.id, email: body.email, name: body.name, phone: body.phone },
    // })

    // TODO: enqueue welcome email
    // await emailQueue.add('welcome', { recipientEmail: body.email, payload: { name: body.name } })

    res.status(201).json({ message: 'TODO: register user', email: body.email })
    void prisma // silence unused import warning until implemented
    void supabaseAdmin
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/users/login
 *
 * Delegates to Supabase Auth. Returns access_token + refresh_token.
 * The client stores access_token and sends it as Bearer on subsequent requests.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = LoginSchema.parse(req.body)

    // TODO: sign in via Supabase Auth
    // const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    //   email: body.email,
    //   password: body.password,
    // })
    // if (error) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401)
    // res.json({ data: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } })

    res.json({ message: 'TODO: login user', email: body.email })
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
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
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
export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
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

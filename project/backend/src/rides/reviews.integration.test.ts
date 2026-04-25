import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { app } from '../app'
import { prisma } from '../lib/prisma'
import { supabaseAdmin } from '../lib/supabase'

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null }

const password = 'password123'

async function promoteToApprovedDriver(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'DRIVER' },
  })

  await prisma.driverProfile.upsert({
    where: { userId },
    create: {
      userId,
      licencePath: 'https://example.com/test-licence.jpg',
      vehicleInfo: {
        make: 'Volvo',
        model: 'V70',
        year: 2018,
        colour: 'Black',
        plateNumber: 'REVTEST1',
      },
      status: 'APPROVED',
      approvedAt: new Date(),
    },
    update: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  })
}

async function cleanupByEmailPrefix(prefix: string) {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  })
  const ids = users.map((u) => u.id)
  if (ids.length === 0) return

  await prisma.review.deleteMany({
    where: {
      OR: [
        { reviewerId: { in: ids } },
        { revieweeId: { in: ids } },
        { ride: { driverId: { in: ids } } },
      ],
    },
  })
  await prisma.booking.deleteMany({
    where: {
      OR: [{ passengerId: { in: ids } }, { ride: { driverId: { in: ids } } }],
    },
  })
  await prisma.ride.deleteMany({ where: { driverId: { in: ids } } })
  await prisma.driverProfile.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })

  for (const id of ids) {
    await supabaseAdmin.auth.admin.deleteUser(id).catch(() => {})
  }
}

async function registerUser(email: string, name: string) {
  const response = await request(app).post('/api/auth/register').send({
    email,
    name,
    password,
  })
  expect(response.status).toBe(201)

  const userId = (response.body as ApiEnvelope<{ id: string }>).data?.id
  if (!userId) throw new Error('missing user id')

  return userId
}

async function loginUser(email: string) {
  const response = await request(app).post('/api/auth/login').send({
    email,
    password,
  })
  expect(response.status).toBe(200)

  const token = (response.body as ApiEnvelope<{ access_token: string }>).data?.access_token
  if (!token) throw new Error('missing access token')

  return token
}

async function createRide(driverToken: string, departureTime = new Date(Date.now() - 3_600_000).toISOString()) {
  const response = await request(app)
    .post('/api/rides')
    .set('Authorization', `Bearer ${driverToken}`)
    .send({
      origin: { address: 'Campus Gate A', lat: 58.9, lng: 5.71 },
      destination: { address: 'City Centre', lat: 58.95, lng: 5.72 },
      departureTime,
      totalSeats: 4,
      pricePerSeat: 50,
    })

  expect(response.status).toBe(201)
  const rideId = (response.body as ApiEnvelope<{ id: string }>).data?.id
  if (!rideId) throw new Error('missing ride id')

  return rideId
}

async function createBooking(rideId: string, passengerToken: string) {
  const response = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${passengerToken}`)
    .send({ rideId, seatsBooked: 1 })

  expect(response.status).toBe(201)
  const bookingId = (response.body as ApiEnvelope<{ id: string }>).data?.id
  if (!bookingId) throw new Error('missing booking id')

  return bookingId
}

async function confirmBooking(bookingId: string, driverToken: string) {
  const response = await request(app)
    .patch(`/api/bookings/${bookingId}/confirm`)
    .set('Authorization', `Bearer ${driverToken}`)

  expect(response.status).toBe(200)
}

async function completeRide(rideId: string, driverToken: string) {
  const startResponse = await request(app)
    .patch(`/api/rides/${rideId}/status`)
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ status: 'ACTIVE' })
  expect(startResponse.status).toBe(200)

  const completeResponse = await request(app)
    .patch(`/api/rides/${rideId}/status`)
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ status: 'COMPLETED' })
  expect(completeResponse.status).toBe(200)
}

describe.sequential('Ride reviews integration', () => {
  const prefix = `ride-reviews-${Date.now()}-`

  afterEach(async () => {
    await cleanupByEmailPrefix(prefix)
  })

  it('success: passenger reviews driver on completed ride', async () => {
    const driverEmail = `${prefix}driver1@university.edu`
    const passengerEmail = `${prefix}passenger1@university.edu`

    const driverId = await registerUser(driverEmail, 'Driver One')
    const passengerId = await registerUser(passengerEmail, 'Passenger One')
    await promoteToApprovedDriver(driverId)

    const driverToken = await loginUser(driverEmail)
    const passengerToken = await loginUser(passengerEmail)
    const rideId = await createRide(driverToken)
    const bookingId = await createBooking(rideId, passengerToken)

    await confirmBooking(bookingId, driverToken)
    await completeRide(rideId, driverToken)

    const response = await request(app)
      .post(`/api/rides/${rideId}/reviews`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        revieweeId: driverId,
        rating: 5,
        comment: 'Safe and punctual ride.',
      })

    expect(response.status).toBe(201)
    const body = response.body as ApiEnvelope<{
      id: string
      rideId: string
      revieweeId: string
      rating: number
      comment: string | null
      reviewer: { id: string; name: string; avatarPath: string | null }
    }>
    expect(body.data?.rideId).toBe(rideId)
    expect(body.data?.revieweeId).toBe(driverId)
    expect(body.data?.rating).toBe(5)
    expect(body.data?.reviewer.id).toBe(passengerId)
    expect(body.data?.reviewer.name).toBe('Passenger One')

    const review = await prisma.review.findFirstOrThrow({
      where: {
        rideId,
        reviewerId: passengerId,
        revieweeId: driverId,
      },
    })
    expect(review.comment).toBe('Safe and punctual ride.')
  })

  it('success: driver reviews confirmed passenger on completed ride', async () => {
    const driverEmail = `${prefix}driver2@university.edu`
    const passengerEmail = `${prefix}passenger2@university.edu`

    const driverId = await registerUser(driverEmail, 'Driver Two')
    const passengerId = await registerUser(passengerEmail, 'Passenger Two')
    await promoteToApprovedDriver(driverId)

    const driverToken = await loginUser(driverEmail)
    const passengerToken = await loginUser(passengerEmail)
    const rideId = await createRide(driverToken)
    const bookingId = await createBooking(rideId, passengerToken)

    await confirmBooking(bookingId, driverToken)
    await completeRide(rideId, driverToken)

    const response = await request(app)
      .post(`/api/rides/${rideId}/reviews`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        revieweeId: passengerId,
        rating: 4,
        comment: 'Passenger was on time.',
      })

    expect(response.status).toBe(201)
    expect((response.body as ApiEnvelope<{ revieweeId: string }>).data?.revieweeId).toBe(passengerId)
  })

  it('reject: ride not completed', async () => {
    const driverEmail = `${prefix}driver3@university.edu`
    const passengerEmail = `${prefix}passenger3@university.edu`

    const driverId = await registerUser(driverEmail, 'Driver Three')
    await registerUser(passengerEmail, 'Passenger Three')
    await promoteToApprovedDriver(driverId)

    const driverToken = await loginUser(driverEmail)
    const passengerToken = await loginUser(passengerEmail)
    const rideId = await createRide(driverToken, new Date(Date.now() + 3_600_000).toISOString())
    const bookingId = await createBooking(rideId, passengerToken)
    await confirmBooking(bookingId, driverToken)

    const response = await request(app)
      .post(`/api/rides/${rideId}/reviews`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        revieweeId: driverId,
        rating: 5,
      })

    expect(response.status).toBe(409)
    expect((response.body as ApiEnvelope<never>).error?.code).toBe('INVALID_RIDE_STATUS')
  })

  it('reject: requester not on ride', async () => {
    const driverEmail = `${prefix}driver4@university.edu`
    const passengerEmail = `${prefix}passenger4@university.edu`
    const outsiderEmail = `${prefix}outsider4@university.edu`

    const driverId = await registerUser(driverEmail, 'Driver Four')
    await registerUser(passengerEmail, 'Passenger Four')
    await registerUser(outsiderEmail, 'Outsider Four')
    await promoteToApprovedDriver(driverId)

    const driverToken = await loginUser(driverEmail)
    const passengerToken = await loginUser(passengerEmail)
    const outsiderToken = await loginUser(outsiderEmail)
    const rideId = await createRide(driverToken)
    const bookingId = await createBooking(rideId, passengerToken)

    await confirmBooking(bookingId, driverToken)
    await completeRide(rideId, driverToken)

    const response = await request(app)
      .post(`/api/rides/${rideId}/reviews`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({
        revieweeId: driverId,
        rating: 3,
      })

    expect(response.status).toBe(403)
    expect((response.body as ApiEnvelope<never>).error?.code).toBe('FORBIDDEN')
  })

  it('reject: reviewee not on ride', async () => {
    const driverEmail = `${prefix}driver5@university.edu`
    const passengerEmail = `${prefix}passenger5@university.edu`
    const outsiderEmail = `${prefix}outsider5@university.edu`

    const driverId = await registerUser(driverEmail, 'Driver Five')
    await registerUser(passengerEmail, 'Passenger Five')
    const outsiderId = await registerUser(outsiderEmail, 'Outsider Five')
    await promoteToApprovedDriver(driverId)

    const driverToken = await loginUser(driverEmail)
    const passengerToken = await loginUser(passengerEmail)
    const rideId = await createRide(driverToken)
    const bookingId = await createBooking(rideId, passengerToken)

    await confirmBooking(bookingId, driverToken)
    await completeRide(rideId, driverToken)

    const response = await request(app)
      .post(`/api/rides/${rideId}/reviews`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        revieweeId: outsiderId,
        rating: 2,
      })

    expect(response.status).toBe(400)
    expect((response.body as ApiEnvelope<never>).error?.code).toBe('INVALID_REVIEWEE')
  })

  it('reject: self-review', async () => {
    const driverEmail = `${prefix}driver6@university.edu`

    const driverId = await registerUser(driverEmail, 'Driver Six')
    await promoteToApprovedDriver(driverId)

    const driverToken = await loginUser(driverEmail)
    const rideId = await createRide(driverToken)
    await completeRide(rideId, driverToken)

    const response = await request(app)
      .post(`/api/rides/${rideId}/reviews`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        revieweeId: driverId,
        rating: 5,
      })

    expect(response.status).toBe(400)
    expect((response.body as ApiEnvelope<never>).error?.code).toBe('INVALID_REVIEWEE')
  })

  it('reject: duplicate review', async () => {
    const driverEmail = `${prefix}driver7@university.edu`
    const passengerEmail = `${prefix}passenger7@university.edu`

    const driverId = await registerUser(driverEmail, 'Driver Seven')
    await registerUser(passengerEmail, 'Passenger Seven')
    await promoteToApprovedDriver(driverId)

    const driverToken = await loginUser(driverEmail)
    const passengerToken = await loginUser(passengerEmail)
    const rideId = await createRide(driverToken)
    const bookingId = await createBooking(rideId, passengerToken)

    await confirmBooking(bookingId, driverToken)
    await completeRide(rideId, driverToken)

    const payload = {
      revieweeId: driverId,
      rating: 5,
      comment: 'Great trip.',
    }

    const firstResponse = await request(app)
      .post(`/api/rides/${rideId}/reviews`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send(payload)
    expect(firstResponse.status).toBe(201)

    const secondResponse = await request(app)
      .post(`/api/rides/${rideId}/reviews`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send(payload)

    expect(secondResponse.status).toBe(409)
    expect((secondResponse.body as ApiEnvelope<never>).error?.code).toBe('DUPLICATE_REVIEW')
  })

  it('reject: unauthenticated', async () => {
    const driverEmail = `${prefix}driver8@university.edu`
    const passengerEmail = `${prefix}passenger8@university.edu`

    const driverId = await registerUser(driverEmail, 'Driver Eight')
    await registerUser(passengerEmail, 'Passenger Eight')
    await promoteToApprovedDriver(driverId)

    const driverToken = await loginUser(driverEmail)
    const passengerToken = await loginUser(passengerEmail)
    const rideId = await createRide(driverToken)
    const bookingId = await createBooking(rideId, passengerToken)

    await confirmBooking(bookingId, driverToken)
    await completeRide(rideId, driverToken)

    const response = await request(app)
      .post(`/api/rides/${rideId}/reviews`)
      .send({
        revieweeId: driverId,
        rating: 5,
      })

    expect(response.status).toBe(401)
    expect((response.body as ApiEnvelope<never>).error?.code).toBe('UNAUTHORIZED')
  })
})

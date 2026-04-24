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
        plateNumber: 'INTTEST1',
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

describe.sequential('Bookings integration (book → confirm / decline)', () => {
  const prefix = `bkflow-${Date.now()}-`
  const driverEmail = `${prefix}drv@university.edu`
  const passengerEmail = `${prefix}pax@university.edu`

  afterEach(async () => {
    await cleanupByEmailPrefix(prefix)
  })

  function ridePayload() {
    const depart = new Date(Date.now() + 86_400_000).toISOString()
    return {
      origin: { address: 'Campus Gate A', lat: 58.9, lng: 5.71 },
      destination: { address: 'City Centre', lat: 58.95, lng: 5.72 },
      departureTime: depart,
      totalSeats: 4,
      pricePerSeat: 50,
    }
  }

  it('POST booking is PENDING; driver PATCH confirm → CONFIRMED', async () => {
    const regD = await request(app).post('/api/auth/register').send({
      email: driverEmail,
      name: 'Driver Flow',
      password,
    })
    expect(regD.status).toBe(201)
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: passengerEmail,
      name: 'Passenger Flow',
      password,
    })
    expect(regP.status).toBe(201)
    const passengerId = (regP.body as ApiEnvelope<{ id: string }>).data?.id
    if (!passengerId) throw new Error('missing passenger id')

    await promoteToApprovedDriver(driverId)

    const loginD = await request(app).post('/api/auth/login').send({ email: driverEmail, password })
    expect(loginD.status).toBe(200)
    const driverToken = (loginD.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!driverToken) throw new Error('missing driver token')

    const createRide = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send(ridePayload())
    expect(createRide.status).toBe(201)
    const rideId = (createRide.body as ApiEnvelope<{ id: string }>).data?.id
    if (!rideId) throw new Error('missing ride id')

    const loginP = await request(app).post('/api/auth/login').send({ email: passengerEmail, password })
    const passengerToken = (loginP.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!passengerToken) throw new Error('missing passenger token')

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ rideId, seatsBooked: 2 })
    expect(bookRes.status).toBe(201)
    const bookingBody = bookRes.body as ApiEnvelope<{ id: string; status: string }>
    expect(bookingBody.data?.status).toBe('PENDING')
    const bookingId = bookingBody.data?.id
    if (!bookingId) throw new Error('missing booking id')

    const rideAfterBook = await prisma.ride.findUniqueOrThrow({ where: { id: rideId } })
    expect(rideAfterBook.availableSeats).toBe(2)

    const confirmRes = await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${driverToken}`)
    expect(confirmRes.status).toBe(200)
    expect((confirmRes.body as ApiEnvelope<{ status: string }>).data?.status).toBe('CONFIRMED')

    const rideAfterConfirm = await prisma.ride.findUniqueOrThrow({ where: { id: rideId } })
    expect(rideAfterConfirm.availableSeats).toBe(2)
  })

  it('driver PATCH decline → CANCELLED and seats restored', async () => {
    const dEmail = `${prefix}d2@university.edu`
    const pEmail = `${prefix}p2@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Two',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Pass Two',
      password,
    })
    const passengerId = (regP.body as ApiEnvelope<{ id: string }>).data?.id
    if (!passengerId) throw new Error('missing passenger id')

    await promoteToApprovedDriver(driverId)

    const loginD = await request(app).post('/api/auth/login').send({ email: dEmail, password })
    const driverToken = (loginD.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!driverToken) throw new Error('missing driver token')

    const createRide = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send(ridePayload())
    const rideId = (createRide.body as ApiEnvelope<{ id: string }>).data?.id
    if (!rideId) throw new Error('missing ride')

    const loginP = await request(app).post('/api/auth/login').send({ email: pEmail, password })
    const passengerToken = (loginP.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!passengerToken) throw new Error('missing passenger token')

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ rideId, seatsBooked: 1 })
    const bookingId = (bookRes.body as ApiEnvelope<{ id: string }>).data?.id
    if (!bookingId) throw new Error('missing booking')

    expect((await prisma.ride.findUniqueOrThrow({ where: { id: rideId } })).availableSeats).toBe(3)

    const declineRes = await request(app)
      .patch(`/api/bookings/${bookingId}/decline`)
      .set('Authorization', `Bearer ${driverToken}`)
    expect(declineRes.status).toBe(200)
    expect((declineRes.body as ApiEnvelope<{ status: string }>).data?.status).toBe('CANCELLED')

    expect((await prisma.ride.findUniqueOrThrow({ where: { id: rideId } })).availableSeats).toBe(4)
  })
})

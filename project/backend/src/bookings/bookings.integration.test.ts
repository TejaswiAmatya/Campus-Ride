import request from 'supertest'
import { afterEach, expect, it } from 'vitest'
import { app } from '../app'
import { prisma } from '../lib/prisma'
import { supabaseAdmin } from '../lib/supabase'
import { describeAuthIntegration } from '../test/integration/gates'

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

describeAuthIntegration('Bookings integration (requires full Supabase auth stack)', () => {
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

  it('passenger PATCH cancel → CANCELLED and seats restored', async () => {
    const dEmail = `${prefix}d3@university.edu`
    const pEmail = `${prefix}p3@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Three',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Pass Three',
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
      .send({ rideId, seatsBooked: 2 })
    const bookingId = (bookRes.body as ApiEnvelope<{ id: string }>).data?.id
    if (!bookingId) throw new Error('missing booking')

    expect((await prisma.ride.findUniqueOrThrow({ where: { id: rideId } })).availableSeats).toBe(2)

    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${passengerToken}`)
    expect(cancelRes.status).toBe(200)
    expect((cancelRes.body as ApiEnvelope<{ status: string }>).data?.status).toBe('CANCELLED')

    expect((await prisma.ride.findUniqueOrThrow({ where: { id: rideId } })).availableSeats).toBe(4)
  })

    it('non-passenger cannot cancel booking (authorization check)', async () => {
    const dEmail = `${prefix}d4@university.edu`
    const pEmail = `${prefix}p4@university.edu`
    const otherEmail = `${prefix}other4@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Four',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Pass Four',
      password,
    })
    const passengerId = (regP.body as ApiEnvelope<{ id: string }>).data?.id
    if (!passengerId) throw new Error('missing passenger id')

    const regOther = await request(app).post('/api/auth/register').send({
      email: otherEmail,
      name: 'Other User',
      password,
    })
    const otherUserId = (regOther.body as ApiEnvelope<{ id: string }>).data?.id
    if (!otherUserId) throw new Error('missing other user id')

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

    const loginOther = await request(app).post('/api/auth/login').send({ email: otherEmail, password })
    const otherToken = (loginOther.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!otherToken) throw new Error('missing other token')

    // Other user tries to cancel passenger's booking
    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(cancelRes.status).toBe(403)
    expect((cancelRes.body as ApiEnvelope<{ error: { code: string } }>).error?.code).toBe('FORBIDDEN')
  })

  it('cannot cancel already-cancelled booking (idempotency check)', async () => {
    const dEmail = `${prefix}d5@university.edu`
    const pEmail = `${prefix}p5@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Five',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Pass Five',
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

    // Cancel booking first time
    const cancelRes1 = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${passengerToken}`)
    expect(cancelRes1.status).toBe(200)

    // Try to cancel the same booking again
    const cancelRes2 = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${passengerToken}`)
    expect(cancelRes2.status).toBe(409)
    expect((cancelRes2.body as ApiEnvelope<{ error: { code: string } }>).error?.code).toBe('INVALID_STATE')
  })

  it('unauthenticated user cannot cancel booking', async () => {
    const bookingId = 'fake-id'
    const cancelRes = await request(app).patch(`/api/bookings/${bookingId}/cancel`)
    expect(cancelRes.status).toBe(401)
    expect((cancelRes.body as ApiEnvelope<{ error: { code: string } }>).error?.code).toBe('UNAUTHORIZED')
  })

  it('cannot cancel non-existent booking', async () => {
    const dEmail = `${prefix}d6@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Six',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const loginD = await request(app).post('/api/auth/login').send({ email: dEmail, password })
    const driverToken = (loginD.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!driverToken) throw new Error('missing driver token')

    const cancelRes = await request(app)
      .patch('/api/bookings/nonexistent-booking-id/cancel')
      .set('Authorization', `Bearer ${driverToken}`)
    expect(cancelRes.status).toBe(404)
    expect((cancelRes.body as ApiEnvelope<{ error: { code: string } }>).error?.code).toBe('NOT_FOUND')
  })

  it('driver can complete a confirmed booking after departure', async () => {
    const dEmail = `${prefix}d7@university.edu`
    const pEmail = `${prefix}p7@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Seven',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Pass Seven',
      password,
    })
    const passengerId = (regP.body as ApiEnvelope<{ id: string }>).data?.id
    if (!passengerId) throw new Error('missing passenger id')

    await promoteToApprovedDriver(driverId)

    const loginD = await request(app).post('/api/auth/login').send({ email: dEmail, password })
    const driverToken = (loginD.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!driverToken) throw new Error('missing driver token')

    // Create ride with departure time in the past (so completion is valid)
    const pastDepart = new Date(Date.now() - 3600_000).toISOString() // 1 hour ago
    const createRide = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        origin: { address: 'Campus Gate A', lat: 58.9, lng: 5.71 },
        destination: { address: 'City Centre', lat: 58.95, lng: 5.72 },
        departureTime: pastDepart,
        totalSeats: 4,
        pricePerSeat: 50,
      })
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

    // Driver confirms the booking
    const confirmRes = await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${driverToken}`)
    expect(confirmRes.status).toBe(200)
    expect((confirmRes.body as ApiEnvelope<{ status: string }>).data?.status).toBe('CONFIRMED')

    // Driver completes the booking
    const completeRes = await request(app)
      .patch(`/api/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
    expect(completeRes.status).toBe(200)
    expect((completeRes.body as ApiEnvelope<{ status: string }>).data?.status).toBe('COMPLETED')
  })

  it('cannot complete booking before departure', async () => {
    const dEmail = `${prefix}d8@university.edu`
    const pEmail = `${prefix}p8@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Eight',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Pass Eight',
      password,
    })
    const passengerId = (regP.body as ApiEnvelope<{ id: string }>).data?.id
    if (!passengerId) throw new Error('missing passenger id')

    await promoteToApprovedDriver(driverId)

    const loginD = await request(app).post('/api/auth/login').send({ email: dEmail, password })
    const driverToken = (loginD.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!driverToken) throw new Error('missing driver token')

    // Create ride with future departure
    const futureDepart = new Date(Date.now() + 3600_000).toISOString() // 1 hour from now
    const createRide = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        origin: { address: 'Campus Gate A', lat: 58.9, lng: 5.71 },
        destination: { address: 'City Centre', lat: 58.95, lng: 5.72 },
        departureTime: futureDepart,
        totalSeats: 4,
        pricePerSeat: 50,
      })
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

    // Confirm the booking
    await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${driverToken}`)

    // Try to complete before departure
    const completeRes = await request(app)
      .patch(`/api/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
    expect(completeRes.status).toBe(409)
    expect((completeRes.body as ApiEnvelope<{ error: { code: string } }>).error?.code).toBe('INVALID_STATE')
  })

  it('non-driver cannot complete booking', async () => {
    const dEmail = `${prefix}d9@university.edu`
    const pEmail = `${prefix}p9@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Nine',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Pass Nine',
      password,
    })
    const passengerId = (regP.body as ApiEnvelope<{ id: string }>).data?.id
    if (!passengerId) throw new Error('missing passenger id')

    await promoteToApprovedDriver(driverId)

    const loginD = await request(app).post('/api/auth/login').send({ email: dEmail, password })
    const driverToken = (loginD.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!driverToken) throw new Error('missing driver token')

    const pastDepart = new Date(Date.now() - 3600_000).toISOString()
    const createRide = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        origin: { address: 'Campus Gate A', lat: 58.9, lng: 5.71 },
        destination: { address: 'City Centre', lat: 58.95, lng: 5.72 },
        departureTime: pastDepart,
        totalSeats: 4,
        pricePerSeat: 50,
      })
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

    // Confirm with actual driver
    await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${driverToken}`)

    // Passenger (not driver) tries to complete
    const completeRes = await request(app)
      .patch(`/api/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${passengerToken}`)
    expect(completeRes.status).toBe(403)
    expect((completeRes.body as ApiEnvelope<{ error: { code: string } }>).error?.code).toBe('FORBIDDEN')
  })

  it('cannot complete non-CONFIRMED booking', async () => {
    const dEmail = `${prefix}d10@university.edu`
    const pEmail = `${prefix}p10@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Ten',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Pass Ten',
      password,
    })
    const passengerId = (regP.body as ApiEnvelope<{ id: string }>).data?.id
    if (!passengerId) throw new Error('missing passenger id')

    await promoteToApprovedDriver(driverId)

    const loginD = await request(app).post('/api/auth/login').send({ email: dEmail, password })
    const driverToken = (loginD.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!driverToken) throw new Error('missing driver token')

    const pastDepart = new Date(Date.now() - 3600_000).toISOString()
    const createRide = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        origin: { address: 'Campus Gate A', lat: 58.9, lng: 5.71 },
        destination: { address: 'City Centre', lat: 58.95, lng: 5.72 },
        departureTime: pastDepart,
        totalSeats: 4,
        pricePerSeat: 50,
      })
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

    // Passenger cancels instead of driver confirming
    await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${passengerToken}`)

    // Try to complete a CANCELLED booking
    const completeRes = await request(app)
      .patch(`/api/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
    expect(completeRes.status).toBe(409)
    expect((completeRes.body as ApiEnvelope<{ error: { code: string } }>).error?.code).toBe('INVALID_STATE')
  })

  it('passenger can filter booking history by status', async () => {
    const dEmail = `${prefix}d11@university.edu`
    const pEmail = `${prefix}p11@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Eleven',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Pass Eleven',
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

    await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${driverToken}`)

    const confirmedRes = await request(app)
      .get('/api/bookings?status=CONFIRMED')
      .set('Authorization', `Bearer ${passengerToken}`)
    expect(confirmedRes.status).toBe(200)
    expect(Array.isArray((confirmedRes.body as ApiEnvelope<unknown[]>).data)).toBe(true)
    const confirmed = (confirmedRes.body as ApiEnvelope<Array<{ id: string; status: string }>>).data ?? []
    expect(confirmed.some((b) => b.id === bookingId && b.status === 'CONFIRMED')).toBe(true)

    const pendingRes = await request(app)
      .get('/api/bookings?status=PENDING')
      .set('Authorization', `Bearer ${passengerToken}`)
    expect(pendingRes.status).toBe(200)
    const pending = (pendingRes.body as ApiEnvelope<Array<{ id: string }>>).data ?? []
    expect(pending.some((b) => b.id === bookingId)).toBe(false)
  })

  it('returns 422 for invalid status filter', async () => {
    const email = `${prefix}badstatus@university.edu`
    await request(app).post('/api/auth/register').send({
      email,
      name: 'Status User',
      password,
    })
    const loginRes = await request(app).post('/api/auth/login').send({ email, password })
    const token = (loginRes.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!token) throw new Error('missing token')

    const res = await request(app).get('/api/bookings?status=DECLINED').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(422)
    expect((res.body as ApiEnvelope<unknown>).error?.code).toBe('VALIDATION_ERROR')
  }, 15000)

  it('checkout stores pickup/drop-off/message and marks the simulated payment as paid', async () => {
    const dEmail = `${prefix}checkout-driver@university.edu`
    const pEmail = `${prefix}checkout-passenger@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Checkout Driver',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Checkout Passenger',
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
      .send({
        origin: { address: 'Campus Gate A', lat: 58.9, lng: 5.71 },
        destination: { address: 'City Centre', lat: 58.95, lng: 5.72 },
        departureTime: new Date(Date.now() + 86_400_000).toISOString(),
        totalSeats: 4,
        pricePerSeat: 50,
      })
    const rideId = (createRide.body as ApiEnvelope<{ id: string }>).data?.id
    if (!rideId) throw new Error('missing ride id')

    const loginP = await request(app).post('/api/auth/login').send({ email: pEmail, password })
    const passengerToken = (loginP.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!passengerToken) throw new Error('missing passenger token')

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        rideId,
        seatsBooked: 2,
        pickup: {
          address: 'Library north entrance',
          lat: 58.901,
          lng: 5.712,
        },
        dropoff: {
          address: 'Student housing side gate',
          lat: 58.949,
          lng: 5.724,
        },
        messageToDriver: 'I will be waiting by the bike racks.',
      })

    expect(bookRes.status).toBe(201)
    const bookingPayload = (bookRes.body as ApiEnvelope<any>).data
    expect(bookingPayload?.status).toBe('PENDING')
    expect(bookingPayload?.paymentStatus).toBe('PAID')
    expect(bookingPayload?.payment?.status).toBe('PAID')
    expect(bookingPayload?.pickup).toMatchObject({
      address: 'Library north entrance',
      lat: 58.901,
      lng: 5.712,
    })
    expect(bookingPayload?.dropoff).toMatchObject({
      address: 'Student housing side gate',
      lat: 58.949,
      lng: 5.724,
    })
    expect(bookingPayload?.messageToDriver).toBe('I will be waiting by the bike racks.')

    const storedBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingPayload.id },
    })
    expect(storedBooking.pickupAddress).toBe('Library north entrance')
    expect(storedBooking.dropoffAddress).toBe('Student housing side gate')
    expect(storedBooking.messageToDriver).toBe('I will be waiting by the bike racks.')
    expect(storedBooking.paymentStatus).toBe('PAID')
    expect(storedBooking.paidAt).toBeTruthy()
  }, 15000)

  it('applies a full refund when a booking is cancelled more than 2 hours before departure', async () => {
    const dEmail = `${prefix}refund-full-driver@university.edu`
    const pEmail = `${prefix}refund-full-passenger@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Refund Full Driver',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Refund Full Passenger',
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
      .send({
        origin: { address: 'Campus Gate A', lat: 58.9, lng: 5.71 },
        destination: { address: 'City Centre', lat: 58.95, lng: 5.72 },
        departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
        totalSeats: 4,
        pricePerSeat: 50,
      })
    const rideId = (createRide.body as ApiEnvelope<{ id: string }>).data?.id
    if (!rideId) throw new Error('missing ride id')

    const loginP = await request(app).post('/api/auth/login').send({ email: pEmail, password })
    const passengerToken = (loginP.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!passengerToken) throw new Error('missing passenger token')

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ rideId, seatsBooked: 2 })
    const bookingId = (bookRes.body as ApiEnvelope<{ id: string }>).data?.id
    if (!bookingId) throw new Error('missing booking id')

    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${passengerToken}`)

    expect(cancelRes.status).toBe(200)
    const payload = (cancelRes.body as ApiEnvelope<any>).data
    expect(payload?.status).toBe('CANCELLED')
    expect(payload?.paymentStatus).toBe('REFUNDED')
    expect(payload?.refund?.amount).toBe('100')
    expect(payload?.cancellation?.policyApplied).toBe('FREE')
  }, 15000)

  it('applies a 50% refund when a booking is cancelled at or within 2 hours before departure', async () => {
    const dEmail = `${prefix}refund-half-driver@university.edu`
    const pEmail = `${prefix}refund-half-passenger@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Refund Half Driver',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Refund Half Passenger',
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
      .send({
        origin: { address: 'Campus Gate A', lat: 58.9, lng: 5.71 },
        destination: { address: 'City Centre', lat: 58.95, lng: 5.72 },
        departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        totalSeats: 4,
        pricePerSeat: 50,
      })
    const rideId = (createRide.body as ApiEnvelope<{ id: string }>).data?.id
    if (!rideId) throw new Error('missing ride id')

    const loginP = await request(app).post('/api/auth/login').send({ email: pEmail, password })
    const passengerToken = (loginP.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!passengerToken) throw new Error('missing passenger token')

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ rideId, seatsBooked: 2 })
    const bookingId = (bookRes.body as ApiEnvelope<{ id: string }>).data?.id
    if (!bookingId) throw new Error('missing booking id')

    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${passengerToken}`)

    expect(cancelRes.status).toBe(200)
    const payload = (cancelRes.body as ApiEnvelope<any>).data
    expect(payload?.status).toBe('CANCELLED')
    expect(payload?.paymentStatus).toBe('PARTIALLY_REFUNDED')
    expect(payload?.refund?.amount).toBe('50')
    expect(payload?.cancellation?.policyApplied).toBe('PARTIAL')
  }, 15000)

  it('marks no-shows with zero refund and releases the seat', async () => {
    const dEmail = `${prefix}noshow-driver@university.edu`
    const pEmail = `${prefix}noshow-passenger@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'No Show Driver',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'No Show Passenger',
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
    if (!rideId) throw new Error('missing ride id')

    const loginP = await request(app).post('/api/auth/login').send({ email: pEmail, password })
    const passengerToken = (loginP.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!passengerToken) throw new Error('missing passenger token')

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ rideId, seatsBooked: 1 })
    const bookingId = (bookRes.body as ApiEnvelope<{ id: string }>).data?.id
    if (!bookingId) throw new Error('missing booking id')

    await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${driverToken}`)

    const noShowRes = await request(app)
      .patch(`/api/bookings/${bookingId}/no-show`)
      .set('Authorization', `Bearer ${driverToken}`)

    expect(noShowRes.status).toBe(200)
    const payload = (noShowRes.body as ApiEnvelope<any>).data
    expect(payload?.status).toBe('CANCELLED')
    expect(payload?.paymentStatus).toBe('PAID')
    expect(payload?.refund?.amount).toBe('0')

    const rideAfterNoShow = await prisma.ride.findUniqueOrThrow({ where: { id: rideId } })
    expect(rideAfterNoShow.availableSeats).toBe(4)
  }, 15000)

  it('allows a picked-up passenger to complete the ride normally', async () => {
    const dEmail = `${prefix}pickup-driver@university.edu`
    const pEmail = `${prefix}pickup-passenger@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Picked Up Driver',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Picked Up Passenger',
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
      .send({
        origin: { address: 'Campus Gate A', lat: 58.9, lng: 5.71 },
        destination: { address: 'City Centre', lat: 58.95, lng: 5.72 },
        departureTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        totalSeats: 4,
        pricePerSeat: 50,
      })
    const rideId = (createRide.body as ApiEnvelope<{ id: string }>).data?.id
    if (!rideId) throw new Error('missing ride id')

    const loginP = await request(app).post('/api/auth/login').send({ email: pEmail, password })
    const passengerToken = (loginP.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!passengerToken) throw new Error('missing passenger token')

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ rideId, seatsBooked: 1 })
    const bookingId = (bookRes.body as ApiEnvelope<{ id: string }>).data?.id
    if (!bookingId) throw new Error('missing booking id')

    await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${driverToken}`)

    const pickedUpRes = await request(app)
      .patch(`/api/bookings/${bookingId}/picked-up`)
      .set('Authorization', `Bearer ${driverToken}`)

    expect(pickedUpRes.status).toBe(200)
    expect((pickedUpRes.body as ApiEnvelope<any>).data?.pickedUpAt).toBeTruthy()

    const completeRes = await request(app)
      .patch(`/api/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)

    expect(completeRes.status).toBe(200)
    expect((completeRes.body as ApiEnvelope<any>).data?.status).toBe('COMPLETED')
  }, 15000)

  it('driver earnings returns weekly/monthly totals and completed ride payouts only for approved drivers', async () => {
    const dEmail = `${prefix}earnings-driver@university.edu`
    const pEmail = `${prefix}earnings-passenger@university.edu`

    const regD = await request(app).post('/api/auth/register').send({
      email: dEmail,
      name: 'Driver Earnings',
      password,
    })
    const driverId = (regD.body as ApiEnvelope<{ id: string }>).data?.id
    if (!driverId) throw new Error('missing driver id')

    const regP = await request(app).post('/api/auth/register').send({
      email: pEmail,
      name: 'Passenger Earnings',
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
      .send({
        origin: { address: 'Campus East', lat: 58.9, lng: 5.71 },
        destination: { address: 'City Library', lat: 58.95, lng: 5.72 },
        departureTime: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        totalSeats: 4,
        pricePerSeat: 50,
      })
    const rideId = (createRide.body as ApiEnvelope<{ id: string }>).data?.id
    if (!rideId) throw new Error('missing ride')

    const loginP = await request(app).post('/api/auth/login').send({ email: pEmail, password })
    const passengerToken = (loginP.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!passengerToken) throw new Error('missing passenger token')

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ rideId, seatsBooked: 2 })
    const bookingId = (bookRes.body as ApiEnvelope<{ id: string }>).data?.id
    if (!bookingId) throw new Error('missing booking id')

    const confirmRes = await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${driverToken}`)
    expect(confirmRes.status).toBe(200)

    const completeRes = await request(app)
      .patch(`/api/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
    expect(completeRes.status).toBe(200)

    const earningsRes = await request(app)
      .get('/api/bookings/earnings')
      .set('Authorization', `Bearer ${driverToken}`)
    expect(earningsRes.status).toBe(200)

    const payload = (earningsRes.body as ApiEnvelope<{
      totals: { thisWeek: string; thisMonth: string; currency: string }
      rides: Array<{
        bookingId: string
        totalPrice: string
        platformFee: string
        driverPayout: string
      }>
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>).data

    expect(payload?.totals.currency).toBe('NOK')
    expect(payload?.totals.thisWeek).toBe('90')
    expect(payload?.totals.thisMonth).toBe('90')
    expect(payload?.rides).toHaveLength(1)
    expect(payload?.rides[0]).toMatchObject({
      bookingId,
      totalPrice: '100',
      platformFee: '10',
      driverPayout: '90',
    })
    expect(payload?.pagination.total).toBe(1)
  }, 15000)

  it('driver earnings rejects drivers without an approved driver profile', async () => {
    const email = `${prefix}earnings-unapproved@university.edu`

    const registerRes = await request(app).post('/api/auth/register').send({
      email,
      name: 'Unapproved Driver',
      password,
    })
    const userId = (registerRes.body as ApiEnvelope<{ id: string }>).data?.id
    if (!userId) throw new Error('missing user id')

    await prisma.user.update({
      where: { id: userId },
      data: { role: 'DRIVER' },
    })

    const loginRes = await request(app).post('/api/auth/login').send({ email, password })
    const token = (loginRes.body as ApiEnvelope<{ access_token: string }>).data?.access_token
    if (!token) throw new Error('missing token')

    const earningsRes = await request(app)
      .get('/api/bookings/earnings')
      .set('Authorization', `Bearer ${token}`)
    expect(earningsRes.status).toBe(403)
    expect((earningsRes.body as ApiEnvelope<unknown>).error?.code).toBe('FORBIDDEN')
  })
})

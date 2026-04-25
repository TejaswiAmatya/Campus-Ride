import { Prisma } from '@prisma/client'
import { describe, it, expect } from 'vitest'
import { CreateBookingSchema, UpdateBookingStatusSchema } from './schemas'

describe('CreateBookingSchema', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts a valid booking', () => {
    expect(CreateBookingSchema.safeParse({ rideId: validUUID, seatsBooked: 2 }).success).toBe(true)
  })

  it('rejects zero seats', () => {
    expect(CreateBookingSchema.safeParse({ rideId: validUUID, seatsBooked: 0 }).success).toBe(false)
  })

  it('rejects more than 8 seats', () => {
    expect(CreateBookingSchema.safeParse({ rideId: validUUID, seatsBooked: 9 }).success).toBe(false)
  })

  it('rejects an invalid UUID', () => {
    expect(CreateBookingSchema.safeParse({ rideId: 'not-a-uuid', seatsBooked: 1 }).success).toBe(false)
  })
})

describe('Fare split calculation', () => {
  const PLATFORM_FEE = new Prisma.Decimal('0.10')

  it('driver receives 90% of the total fare', () => {
    const pricePerSeat = new Prisma.Decimal(100)
    const seatsBooked = 2
    const totalFare = pricePerSeat.mul(seatsBooked)
    const platformFee = totalFare.mul(PLATFORM_FEE)
    const driverEarnings = totalFare.sub(platformFee)

    expect(totalFare.toNumber()).toBe(200)
    expect(platformFee.toNumber()).toBe(20)
    expect(driverEarnings.toNumber()).toBe(180)
    expect(driverEarnings.div(totalFare).toNumber()).toBe(0.9)
  })

  it('platform receives exactly 10% of the total fare', () => {
    const totalFare = new Prisma.Decimal(150)
    const platformFee = totalFare.mul(PLATFORM_FEE)
    expect(platformFee.toNumber()).toBeCloseTo(15)
  })
})

describe('UpdateBookingStatusSchema', () => {
  it('accepts CONFIRMED', () => {
    expect(UpdateBookingStatusSchema.safeParse({ status: 'CONFIRMED' }).success).toBe(true)
  })

  it('accepts CANCELLED with an optional reason', () => {
    expect(
      UpdateBookingStatusSchema.safeParse({ status: 'CANCELLED', reason: 'Change of plans' }).success,
    ).toBe(true)
  })

  it('rejects PENDING (not a valid transition target)', () => {
    expect(UpdateBookingStatusSchema.safeParse({ status: 'PENDING' }).success).toBe(false)
  })

  it('rejects a reason longer than 500 chars', () => {
    expect(
      UpdateBookingStatusSchema.safeParse({ status: 'CANCELLED', reason: 'x'.repeat(501) }).success,
    ).toBe(false)
  })
})

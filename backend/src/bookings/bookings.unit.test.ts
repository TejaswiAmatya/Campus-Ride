import { Prisma } from '@prisma/client'
import { describe, expect, it } from 'vitest'

import { getCancellationRefundResult } from './controller'
import {
  CancelBookingSchema,
  CreateBookingSchema,
  ListBookingsSchema,
  UpdateBookingCheckpointSchema,
  UpdateBookingStatusSchema,
} from './schemas'

describe('CreateBookingSchema', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts a valid booking with pickup, dropoff, and message', () => {
    expect(
      CreateBookingSchema.safeParse({
        rideId: validUUID,
        seatsBooked: 2,
        pickup: {
          address: 'Campus east entrance',
          lat: 58.9,
          lng: 5.71,
        },
        dropoff: {
          address: 'City library side door',
          lat: 58.95,
          lng: 5.72,
        },
        messageToDriver: 'Blue jacket, waiting by the bike racks.',
      }).success,
    ).toBe(true)
  })

  it('normalizes an empty message to undefined', () => {
    const parsed = CreateBookingSchema.parse({
      rideId: validUUID,
      seatsBooked: 1,
      messageToDriver: '   ',
    })

    expect(parsed.messageToDriver).toBeUndefined()
  })

  it('rejects zero seats', () => {
    expect(
      CreateBookingSchema.safeParse({ rideId: validUUID, seatsBooked: 0 }).success,
    ).toBe(false)
  })

  it('rejects more than 8 seats', () => {
    expect(
      CreateBookingSchema.safeParse({ rideId: validUUID, seatsBooked: 9 }).success,
    ).toBe(false)
  })

  it('rejects an invalid UUID', () => {
    expect(
      CreateBookingSchema.safeParse({ rideId: 'not-a-uuid', seatsBooked: 1 }).success,
    ).toBe(false)
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

describe('Cancellation refund policy', () => {
  const totalFare = new Prisma.Decimal(100)

  it('returns a full refund when cancelled more than 2 hours before departure', () => {
    const departureTime = new Date(Date.now() + 2 * 60 * 60 * 1000 + 60_000)
    const result = getCancellationRefundResult(departureTime, totalFare)

    expect(result.policyWindow).toBe('FREE')
    expect(result.refundAmount.toNumber()).toBe(100)
  })

  it('returns a 50% refund at the exact 2 hour boundary', () => {
    const departureTime = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const result = getCancellationRefundResult(departureTime, totalFare)

    expect(result.policyWindow).toBe('PARTIAL')
    expect(result.refundAmount.toNumber()).toBe(50)
  })

  it('returns a 50% refund when cancelled within 2 hours before departure', () => {
    const departureTime = new Date(Date.now() + 90 * 60 * 1000)
    const result = getCancellationRefundResult(departureTime, totalFare)

    expect(result.policyWindow).toBe('PARTIAL')
    expect(result.refundAmount.toNumber()).toBe(50)
  })

  it('returns no refund once the departure time has passed', () => {
    const departureTime = new Date(Date.now() - 60_000)
    const result = getCancellationRefundResult(departureTime, totalFare)

    expect(result.policyWindow).toBe('NO_REFUND')
    expect(result.refundAmount.toNumber()).toBe(0)
  })
})

describe('UpdateBookingStatusSchema', () => {
  it('accepts CONFIRMED', () => {
    expect(
      UpdateBookingStatusSchema.safeParse({ status: 'CONFIRMED' }).success,
    ).toBe(true)
  })

  it('accepts CANCELLED with an optional reason', () => {
    expect(
      UpdateBookingStatusSchema.safeParse({
        status: 'CANCELLED',
        reason: 'Change of plans',
      }).success,
    ).toBe(true)
  })

  it('accepts DECLINED with an optional reason', () => {
    expect(
      UpdateBookingStatusSchema.safeParse({
        status: 'DECLINED',
        reason: 'Route is full',
      }).success,
    ).toBe(true)
  })

  it('rejects PENDING (not a valid transition target)', () => {
    expect(
      UpdateBookingStatusSchema.safeParse({ status: 'PENDING' }).success,
    ).toBe(false)
  })

  it('rejects a reason longer than 500 chars', () => {
    expect(
      UpdateBookingStatusSchema.safeParse({
        status: 'CANCELLED',
        reason: 'x'.repeat(501),
      }).success,
    ).toBe(false)
  })
})

describe('CancelBookingSchema', () => {
  it('accepts an optional reason', () => {
    expect(
      CancelBookingSchema.safeParse({ reason: 'I no longer need the seat' }).success,
    ).toBe(true)
  })
})

describe('ListBookingsSchema', () => {
  it('transforms asDriver and upcoming query flags into booleans', () => {
    const parsed = ListBookingsSchema.parse({
      asDriver: 'true',
      upcoming: 'false',
      status: 'CONFIRMED',
    })

    expect(parsed).toEqual({
      asDriver: true,
      upcoming: false,
      status: 'CONFIRMED',
    })
  })

  it('rejects an unsupported booking status filter', () => {
    expect(
      ListBookingsSchema.safeParse({
        status: 'DECLINED',
      }).success,
    ).toBe(false)
  })
})

describe('UpdateBookingCheckpointSchema', () => {
  it('accepts an optional checkpoint note', () => {
    expect(
      UpdateBookingCheckpointSchema.safeParse({
        note: 'Passenger confirmed they are in the car.',
      }).success,
    ).toBe(true)
  })
})

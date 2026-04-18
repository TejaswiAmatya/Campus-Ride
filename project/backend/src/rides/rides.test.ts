import { describe, it, expect } from 'vitest'
import { CreateRideSchema, SearchRidesSchema, UpdateRideStatusSchema } from './schemas'

const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

const validRide = {
  originAddress: '1 University Drive',
  originLat: 58.9,
  originLng: 5.7,
  destinationAddress: 'Central Station',
  destinationLat: 58.97,
  destinationLng: 5.73,
  departureTime: futureDate,
  totalSeats: 3,
  pricePerSeat: 80,
}

describe('CreateRideSchema', () => {
  it('accepts a valid ride', () => {
    expect(CreateRideSchema.safeParse(validRide).success).toBe(true)
  })

  it('rejects zero seats', () => {
    expect(CreateRideSchema.safeParse({ ...validRide, totalSeats: 0 }).success).toBe(false)
  })

  it('rejects more than 8 seats', () => {
    expect(CreateRideSchema.safeParse({ ...validRide, totalSeats: 9 }).success).toBe(false)
  })

  it('rejects a negative price', () => {
    expect(CreateRideSchema.safeParse({ ...validRide, pricePerSeat: -10 }).success).toBe(false)
  })

  it('rejects a zero price', () => {
    expect(CreateRideSchema.safeParse({ ...validRide, pricePerSeat: 0 }).success).toBe(false)
  })

  it('rejects an invalid datetime', () => {
    expect(
      CreateRideSchema.safeParse({ ...validRide, departureTime: '2024-13-45' }).success,
    ).toBe(false)
  })

  it('rejects an out-of-range latitude', () => {
    expect(CreateRideSchema.safeParse({ ...validRide, originLat: 91 }).success).toBe(false)
  })

  it('rejects an out-of-range longitude', () => {
    expect(CreateRideSchema.safeParse({ ...validRide, originLng: 181 }).success).toBe(false)
  })
})

describe('SearchRidesSchema', () => {
  it('accepts an empty query (no filters)', () => {
    expect(SearchRidesSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a valid date string', () => {
    expect(SearchRidesSchema.safeParse({ date: '2025-06-15' }).success).toBe(true)
  })

  it('rejects a bad date format', () => {
    expect(SearchRidesSchema.safeParse({ date: '15-06-2025' }).success).toBe(false)
  })

  it('coerces seats from a string to a number', () => {
    const result = SearchRidesSchema.safeParse({ seats: '2' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.seats).toBe(2)
  })
})

describe('UpdateRideStatusSchema', () => {
  it('accepts IN_PROGRESS', () => {
    expect(UpdateRideStatusSchema.safeParse({ status: 'IN_PROGRESS' }).success).toBe(true)
  })

  it('accepts COMPLETED', () => {
    expect(UpdateRideStatusSchema.safeParse({ status: 'COMPLETED' }).success).toBe(true)
  })

  it('accepts CANCELLED', () => {
    expect(UpdateRideStatusSchema.safeParse({ status: 'CANCELLED' }).success).toBe(true)
  })

  it('rejects OPEN (driver cannot re-open a ride)', () => {
    expect(UpdateRideStatusSchema.safeParse({ status: 'OPEN' }).success).toBe(false)
  })
})

import { Prisma } from '@prisma/client'
import { describe, expect, it } from 'vitest'

import { mapDriverForApi, serializeMyRide, serializeRideList } from './serialize'

function makeDriver(overrides: Partial<{
  id: string
  name: string
  avatarPath: string | null
  accountStatus: string | null
  driverProfile: { vehicleInfo: Prisma.JsonValue } | null
}> = {}) {
  return {
    id: overrides.id ?? 'driver-1',
    name: overrides.name ?? 'Alice Driver',
    avatarPath: overrides.avatarPath ?? 'https://example.com/alice.png',
    accountStatus: overrides.accountStatus ?? 'ACTIVE',
    driverProfile: overrides.driverProfile ?? {
      vehicleInfo: {
        make: 'Volvo',
        model: 'V70',
        year: '2018',
        colour: 'Black',
        plateNumber: 'AB12345',
      },
    },
  }
}

describe('mapDriverForApi', () => {
  it('parses vehicle details and hides identity for deactivated accounts', () => {
    const driver = mapDriverForApi(makeDriver({
      accountStatus: 'DEACTIVATED',
    }))

    expect(driver).toEqual({
      id: 'driver-1',
      name: 'Deleted account',
      avatarUrl: null,
      vehicle: {
        make: 'Volvo',
        model: 'V70',
        year: 2018,
        colour: 'Black',
        plateNumber: 'AB12345',
      },
    })
  })

  it('returns null vehicle when vehicle info is malformed', () => {
    const driver = mapDriverForApi(makeDriver({
      driverProfile: { vehicleInfo: { make: 'Volvo', year: 'bad' } },
    }))

    expect(driver.vehicle).toBeNull()
  })
})

describe('serializeRideList', () => {
  it('serializes recurring rides with stringified decimals and defaults', () => {
    const serialized = serializeRideList({
      id: 'ride-1',
      rideSeriesId: 'series-1',
      originAddress: 'Campus North',
      originLat: 58.9,
      originLng: 5.71,
      destinationAddress: 'Campus South',
      destinationLat: 58.95,
      destinationLng: 5.72,
      departureTime: new Date('2026-05-10T08:30:00.000Z'),
      availableSeats: 2,
      totalSeats: 4,
      pricePerSeat: new Prisma.Decimal('75.50'),
      status: 'OPEN',
      recurrencePattern: 'WEEKLY',
      recurrenceDays: [1, 3],
      recurrenceInstanceAt: new Date('2026-05-17T08:30:00.000Z'),
      driver: makeDriver(),
      stops: [{ id: 'stop-1', address: 'Library', lat: 58.91, lng: 5.715, orderIndex: 0 }],
    })

    expect(serialized).toMatchObject({
      id: 'ride-1',
      pricePerSeat: '75.5',
      offerType: 'RECURRING',
      recurrencePattern: 'WEEKLY',
      recurrenceDays: [1, 3],
      recurrenceInstanceAt: '2026-05-17T08:30:00.000Z',
      detourFlexibilityKm: 0,
      preferences: [],
      routePolyline: null,
      routeDistanceKm: null,
      routeDurationMinutes: null,
      stops: [{ id: 'stop-1', address: 'Library', lat: 58.91, lng: 5.715, orderIndex: 0 }],
    })
  })

  it('marks non-recurring rides as one-time', () => {
    const serialized = serializeRideList({
      id: 'ride-2',
      originAddress: 'A',
      originLat: 1,
      originLng: 2,
      destinationAddress: 'B',
      destinationLat: 3,
      destinationLng: 4,
      departureTime: new Date('2026-05-10T08:30:00.000Z'),
      availableSeats: 1,
      totalSeats: 1,
      pricePerSeat: new Prisma.Decimal('10'),
      status: 'OPEN',
      driver: makeDriver(),
    })

    expect(serialized.offerType).toBe('ONE_TIME')
  })
})

describe('serializeMyRide', () => {
  it('aggregates passenger counts, earnings, and passenger reviews deterministically', () => {
    const serialized = serializeMyRide({
      id: 'ride-3',
      originAddress: 'Campus North',
      originLat: 58.9,
      originLng: 5.71,
      destinationAddress: 'Campus South',
      destinationLat: 58.95,
      destinationLng: 5.72,
      departureTime: new Date('2026-05-10T08:30:00.000Z'),
      availableSeats: 1,
      totalSeats: 4,
      pricePerSeat: new Prisma.Decimal('40'),
      status: 'OPEN',
      driver: makeDriver(),
      bookings: [
        {
          id: 'booking-pending',
          seatsBooked: 1,
          status: 'PENDING',
          totalFare: new Prisma.Decimal('40'),
          driverEarnings: new Prisma.Decimal('36'),
          passenger: {
            id: 'passenger-1',
            name: 'Pending Passenger',
            avatarPath: 'https://example.com/p1.png',
            accountStatus: 'ACTIVE',
          },
        },
        {
          id: 'booking-completed',
          seatsBooked: 2,
          status: 'COMPLETED',
          totalFare: new Prisma.Decimal('80'),
          driverEarnings: new Prisma.Decimal('72'),
          passenger: {
            id: 'passenger-2',
            name: 'Completed Passenger',
            avatarPath: 'https://example.com/p2.png',
            accountStatus: 'ACTIVE',
          },
        },
        {
          id: 'booking-confirmed',
          seatsBooked: 1,
          status: 'CONFIRMED',
          totalFare: new Prisma.Decimal('40'),
          driverEarnings: new Prisma.Decimal('36'),
          passenger: {
            id: 'passenger-3',
            name: 'Hidden Passenger',
            avatarPath: 'https://example.com/p3.png',
            accountStatus: 'DEACTIVATED',
          },
        },
      ],
      reviews: [
        {
          id: 'review-1',
          reviewerId: 'driver-1',
          revieweeId: 'passenger-2',
          rating: 5,
          comment: 'Excellent rider.',
          createdAt: new Date('2026-05-11T10:00:00.000Z'),
        },
      ],
      _count: { bookings: 3 },
    })

    expect(serialized.stats).toEqual({
      totalPassengers: 3,
      completedPassengers: 2,
      totalEarnings: '108',
      completedEarnings: '72',
      pendingRequests: 1,
      completedBookings: 1,
    })
    expect(serialized.bookings).toEqual([
      {
        id: 'booking-pending',
        seatsBooked: 1,
        status: 'PENDING',
        totalFare: '40',
        driverEarnings: '36',
        passenger: {
          id: 'passenger-1',
          name: 'Pending Passenger',
          avatarUrl: 'https://example.com/p1.png',
        },
        review: null,
      },
      {
        id: 'booking-completed',
        seatsBooked: 2,
        status: 'COMPLETED',
        totalFare: '80',
        driverEarnings: '72',
        passenger: {
          id: 'passenger-2',
          name: 'Completed Passenger',
          avatarUrl: 'https://example.com/p2.png',
        },
        review: {
          id: 'review-1',
          rating: 5,
          comment: 'Excellent rider.',
          createdAt: '2026-05-11T10:00:00.000Z',
        },
      },
      {
        id: 'booking-confirmed',
        seatsBooked: 1,
        status: 'CONFIRMED',
        totalFare: '40',
        driverEarnings: '36',
        passenger: {
          id: 'passenger-3',
          name: 'Deleted account',
          avatarUrl: null,
        },
        review: null,
      },
    ])
    expect(serialized._count).toEqual({ bookings: 3 })
  })
})

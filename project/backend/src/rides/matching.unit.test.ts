import { describe, expect, it } from 'vitest'

import type { SearchRidesInput } from './schemas'
import { rankSearchRides, scoreRideMatch } from './matching'

function makeRideCandidate(overrides: Partial<{
  id: string
  originLat: number
  originLng: number
  destinationLat: number
  destinationLng: number
  departureTime: Date
  availableSeats: number
  totalSeats: number
  pricePerSeat: number
  detourFlexibilityKm: number | null
  preferences: string[]
  stops: Array<{ lat: number; lng: number }>
  driverRating: number | null
}> = {}) {
  return {
    id: overrides.id ?? 'ride-1',
    originLat: overrides.originLat ?? 58.9,
    originLng: overrides.originLng ?? 5.71,
    destinationLat: overrides.destinationLat ?? 58.95,
    destinationLng: overrides.destinationLng ?? 5.72,
    departureTime: overrides.departureTime ?? new Date('2026-05-10T08:00:00.000Z'),
    availableSeats: overrides.availableSeats ?? 3,
    totalSeats: overrides.totalSeats ?? 3,
    pricePerSeat: overrides.pricePerSeat ?? 50,
    detourFlexibilityKm: overrides.detourFlexibilityKm ?? 2,
    preferences: overrides.preferences ?? ['quiet', 'music'],
    stops: overrides.stops ?? [],
    driverRating: overrides.driverRating ?? 4.6,
  }
}

describe('scoreRideMatch', () => {
  it('returns a deterministic high score for an exact route and departure match', () => {
    const ride = makeRideCandidate({
      availableSeats: 4,
      totalSeats: 4,
      pricePerSeat: 50,
    })
    const query: SearchRidesInput = {
      originLat: 58.9,
      originLng: 5.71,
      destLat: 58.95,
      destLng: 5.72,
      earliestDepartureTime: '2026-05-10T07:00:00.000Z',
      latestDepartureTime: '2026-05-10T09:00:00.000Z',
      seats: 1,
      preferences: ['quiet'],
    }

    const breakdown = scoreRideMatch(ride, query, {
      minPrice: 50,
      maxPrice: 100,
    })

    expect(breakdown).toMatchObject({
      pickup: 1,
      dropoff: 1,
      stops: 0,
      detour: 1,
      departure: 1,
      seats: 1,
      price: 1,
      preferences: 1,
    })
    expect(breakdown.total).toBeCloseTo(0.88, 10)
  })

  it('degrades departure score when the ride is far outside the requested window', () => {
    const ride = makeRideCandidate({
      departureTime: new Date('2026-05-10T13:30:00.000Z'),
    })
    const query: SearchRidesInput = {
      earliestDepartureTime: '2026-05-10T08:00:00.000Z',
      latestDepartureTime: '2026-05-10T09:00:00.000Z',
    }

    const breakdown = scoreRideMatch(ride, query, {
      minPrice: 20,
      maxPrice: 60,
    })

    expect(breakdown.departure).toBe(0)
  })

  it('awards stop proximity when a stop is near the requested pickup', () => {
    const ride = makeRideCandidate({
      stops: [{ lat: 58.901, lng: 5.711 }],
    })
    const query: SearchRidesInput = {
      pickupLat: 58.9011,
      pickupLng: 5.7111,
      radiusKm: 2,
    }

    const breakdown = scoreRideMatch(ride, query, {
      minPrice: 40,
      maxPrice: 80,
    })

    expect(breakdown.stops).toBeGreaterThan(0.9)
    expect(breakdown.pickup).toBeGreaterThan(0.9)
  })
})

describe('rankSearchRides', () => {
  it('sorts by price before best-match tie breakers when requested', () => {
    const query: SearchRidesInput = {
      sortBy: 'price',
      pickupLat: 58.9,
      pickupLng: 5.71,
      dropoffLat: 58.95,
      dropoffLng: 5.72,
    }

    const ranked = rankSearchRides([
      makeRideCandidate({ id: 'expensive', pricePerSeat: 90 }),
      makeRideCandidate({ id: 'cheap', pricePerSeat: 40 }),
    ], query)

    expect(ranked.map((ride) => ride.id)).toEqual(['cheap', 'expensive'])
  })

  it('sorts by rating descending when requested', () => {
    const query: SearchRidesInput = { sortBy: 'rating' }

    const ranked = rankSearchRides([
      makeRideCandidate({ id: 'mid', driverRating: 4.2 }),
      makeRideCandidate({ id: 'top', driverRating: 4.9 }),
      makeRideCandidate({ id: 'missing', driverRating: 0 }),
    ], query)

    expect(ranked.map((ride) => ride.id)).toEqual(['top', 'mid', 'missing'])
  })

  it('uses departure time as the final deterministic tie breaker', () => {
    const query: SearchRidesInput = {}

    const ranked = rankSearchRides([
      makeRideCandidate({
        id: 'later',
        departureTime: new Date('2026-05-10T09:00:00.000Z'),
        pricePerSeat: 50,
      }),
      makeRideCandidate({
        id: 'earlier',
        departureTime: new Date('2026-05-10T08:00:00.000Z'),
        pricePerSeat: 50,
      }),
    ], query)

    expect(ranked.map((ride) => ride.id)).toEqual(['earlier', 'later'])
  })
})

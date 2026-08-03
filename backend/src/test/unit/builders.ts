import { Prisma, RideStatus, Role, type Report, type Ride, type User } from '@prisma/client'

const BASE_TIME = new Date('2026-01-15T09:00:00.000Z')

let sequence = 0

function nextSequence() {
  sequence += 1
  return sequence
}

function makeUuid(seed: number): string {
  return `00000000-0000-4000-8000-${seed.toString().padStart(12, '0')}`
}

export function resetUnitBuilders() {
  sequence = 0
}

export function fixedDate(offsetDays = 0): Date {
  return new Date(BASE_TIME.getTime() + offsetDays * 24 * 60 * 60 * 1000)
}

export function buildUser(overrides: Partial<User> = {}): User {
  const seed = nextSequence()

  return {
    id: makeUuid(seed),
    email: `user-${seed}@university.edu`,
    name: `User ${seed}`,
    phone: null,
    role: Role.PASSENGER,
    accountStatus: 'ACTIVE',
    suspendedUntil: null,
    mustChangePassword: false,
    avatarPath: null,
    bio: null,
    homeAddress: null,
    homeLat: null,
    homeLng: null,
    campusAddress: null,
    campusLat: null,
    campusLng: null,
    academicRole: null,
    academicVerificationStatus: 'NOT_SUBMITTED',
    academicIdPath: null,
    academicVerifiedAt: null,
    academicRejectionReason: null,
    createdAt: fixedDate(),
    updatedAt: fixedDate(),
    ...overrides,
  }
}

export function buildRide(overrides: Partial<Ride> = {}): Ride {
  const seed = nextSequence()

  return {
    id: makeUuid(seed),
    driverId: makeUuid(seed + 1000),
    originAddress: 'Campus North',
    originLat: 59.9139,
    originLng: 10.7522,
    destinationAddress: 'Campus South',
    destinationLat: 59.915,
    destinationLng: 10.76,
    departureTime: fixedDate(1),
    totalSeats: 4,
    availableSeats: 2,
    pricePerSeat: new Prisma.Decimal('25.00'),
    detourFlexibilityKm: 0,
    preferences: [],
    routePolyline: null,
    routeDistanceKm: null,
    routeDurationMinutes: null,
    rideSeriesId: null,
    recurrencePattern: 'NONE',
    recurrenceDays: [],
    recurrenceInstanceAt: null,
    status: RideStatus.OPEN,
    createdAt: fixedDate(),
    updatedAt: fixedDate(),
    ...overrides,
  }
}

export function buildReport(overrides: Partial<Report> = {}): Report {
  const seed = nextSequence()

  return {
    id: makeUuid(seed),
    reporterId: makeUuid(seed + 2000),
    targetUserId: makeUuid(seed + 3000),
    targetRideId: makeUuid(seed + 4000),
    targetUserRole: Role.DRIVER,
    reason: 'Driver made me feel unsafe during the ride',
    status: 'OPEN',
    note: null,
    createdAt: fixedDate(),
    updatedAt: fixedDate(),
    ...overrides,
  }
}

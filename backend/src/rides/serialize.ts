import { Prisma } from '@prisma/client'
import { toAvatarUrlSummary } from '../lib/userDisplay'

export type RideDriverApi = {
  id: string
  name: string
  avatarUrl: string | null
  vehicle: {
    make: string
    model: string
    year: number
    colour: string
    plateNumber: string
  } | null
}

export type RideBookingApi = {
  id: string
  seatsBooked: number
  status: string
  totalFare: string
  driverEarnings: string
  passenger: {
    id: string
    name: string
    avatarUrl: string | null
  }
  review: {
    id: string
    rating: number
    comment: string | null
    createdAt: string
  } | null
}

export type RideStopApi = {
  id?: string
  address: string
  lat: number
  lng: number
  orderIndex: number
}

type DriverRow = {
  id: string
  name: string
  avatarPath: string | null
  accountStatus?: string | null
  driverProfile: { vehicleInfo: Prisma.JsonValue } | null
}

type PassengerRow = {
  id: string
  name: string
  avatarPath: string | null
  accountStatus?: string | null
}

function parseVehicle(
  vehicleInfo: Prisma.JsonValue | null | undefined,
): RideDriverApi['vehicle'] {
  if (!vehicleInfo || typeof vehicleInfo !== 'object' || Array.isArray(vehicleInfo)) {
    return null
  }
  const o = vehicleInfo as Record<string, unknown>
  const make = o.make
  const model = o.model
  const year = o.year
  const colour = o.colour
  const plateNumber = o.plateNumber
  if (
    typeof make !== 'string' ||
    typeof model !== 'string' ||
    (typeof year !== 'number' && typeof year !== 'string') ||
    typeof colour !== 'string' ||
    typeof plateNumber !== 'string'
  ) {
    return null
  }
  const y = typeof year === 'number' ? year : parseInt(String(year), 10)
  if (!Number.isFinite(y)) return null
  return { make, model, year: y, colour, plateNumber }
}

export function mapDriverForApi(driver: DriverRow): RideDriverApi {
  return {
    ...toAvatarUrlSummary(driver),
    vehicle: parseVehicle(driver.driverProfile?.vehicleInfo ?? null),
  }
}

function mapPassengerForApi(passenger: PassengerRow) {
  return toAvatarUrlSummary(passenger)
}

function toDecimalString(value: Prisma.Decimal | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return '0.00'
  }

  return new Prisma.Decimal(value).toString()
}

export function serializeRideList(ride: {
  id: string
  rideSeriesId?: string | null
  originAddress: string
  originLat: number
  originLng: number
  destinationAddress: string
  destinationLat: number
  destinationLng: number
  departureTime: Date
  availableSeats: number
  totalSeats: number
  pricePerSeat: Prisma.Decimal
  detourFlexibilityKm?: number
  preferences?: string[]
  routePolyline?: string | null
  routeDistanceKm?: number | null
  routeDurationMinutes?: number | null
  recurrencePattern?: string
  recurrenceDays?: number[]
  recurrenceInstanceAt?: Date | null
  status: string
  driver: DriverRow
  stops?: Array<{
    id?: string
    address: string
    lat: number
    lng: number
    orderIndex: number
  }>
}) {
  return {
    id: ride.id,
    rideSeriesId: ride.rideSeriesId ?? null,
    originAddress: ride.originAddress,
    originLat: ride.originLat,
    originLng: ride.originLng,
    destinationAddress: ride.destinationAddress,
    destinationLat: ride.destinationLat,
    destinationLng: ride.destinationLng,
    departureTime: ride.departureTime.toISOString(),
    availableSeats: ride.availableSeats,
    totalSeats: ride.totalSeats,
    pricePerSeat: ride.pricePerSeat.toString(),
    detourFlexibilityKm: ride.detourFlexibilityKm ?? 0,
    preferences: ride.preferences ?? [],
    routePolyline: ride.routePolyline ?? null,
    routeDistanceKm: ride.routeDistanceKm ?? null,
    routeDurationMinutes: ride.routeDurationMinutes ?? null,
    recurrencePattern: ride.recurrencePattern ?? 'NONE',
    recurrenceDays: ride.recurrenceDays ?? [],
    recurrenceInstanceAt: ride.recurrenceInstanceAt?.toISOString() ?? null,
    offerType:
      ride.rideSeriesId ||
      (ride.recurrencePattern && ride.recurrencePattern !== 'NONE')
        ? 'RECURRING'
        : 'ONE_TIME',
    stops: (Array.isArray(ride.stops) ? ride.stops : []).map((stop) => ({
      id: stop.id,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      orderIndex: stop.orderIndex,
    })),
    status: ride.status,
    driver: mapDriverForApi(ride.driver),
  }
}

export function serializeMyRide(ride: {
  id: string
  originAddress: string
  originLat: number
  originLng: number
  destinationAddress: string
  destinationLat: number
  destinationLng: number
  departureTime: Date
  availableSeats: number
  totalSeats: number
  pricePerSeat: Prisma.Decimal
  status: string
  driver: DriverRow
  rideSeriesId?: string | null
  detourFlexibilityKm?: number
  preferences?: string[]
  routePolyline?: string | null
  routeDistanceKm?: number | null
  routeDurationMinutes?: number | null
  recurrencePattern?: string
  recurrenceDays?: number[]
  recurrenceInstanceAt?: Date | null
  stops?: Array<{
    id?: string
    address: string
    lat: number
    lng: number
    orderIndex: number
  }>
  bookings: Array<{
    id: string
    seatsBooked: number
    status: string
    totalFare: Prisma.Decimal
    driverEarnings: Prisma.Decimal
    passenger: PassengerRow
  }>
  reviews?: Array<{
    id: string
    reviewerId: string
    revieweeId: string
    rating: number
    comment: string | null
    createdAt: Date
  }>
  _count?: {
    bookings: number
  }
}) {
  const totalPassengers = ride.bookings
    .filter((booking) => booking.status === 'CONFIRMED' || booking.status === 'COMPLETED')
    .reduce((sum, booking) => sum + booking.seatsBooked, 0)
  const completedPassengers = ride.bookings
    .filter((booking) => booking.status === 'COMPLETED')
    .reduce((sum, booking) => sum + booking.seatsBooked, 0)
  const totalEarnings = ride.bookings
    .filter((booking) => booking.status === 'CONFIRMED' || booking.status === 'COMPLETED')
    .reduce((sum, booking) => sum.add(booking.driverEarnings), new Prisma.Decimal(0))
  const completedEarnings = ride.bookings
    .filter((booking) => booking.status === 'COMPLETED')
    .reduce((sum, booking) => sum.add(booking.driverEarnings), new Prisma.Decimal(0))

  return {
    ...serializeRideList(ride),
    bookings: ride.bookings.map((booking) => {
      const review = (ride.reviews ?? []).find(
        (entry) =>
          entry.reviewerId === ride.driver.id &&
          entry.revieweeId === booking.passenger.id,
      )

      return {
        id: booking.id,
        seatsBooked: booking.seatsBooked,
        status: booking.status,
        totalFare: toDecimalString(booking.totalFare),
        driverEarnings: toDecimalString(booking.driverEarnings),
        passenger: mapPassengerForApi(booking.passenger),
        review: review
          ? {
              id: review.id,
              rating: review.rating,
              comment: review.comment,
              createdAt: review.createdAt.toISOString(),
            }
          : null,
      }
    }),
    _count: ride._count,
    stats: {
      totalPassengers,
      completedPassengers,
      totalEarnings: toDecimalString(totalEarnings),
      completedEarnings: toDecimalString(completedEarnings),
      pendingRequests: ride.bookings.filter((booking) => booking.status === 'PENDING').length,
      completedBookings: ride.bookings.filter((booking) => booking.status === 'COMPLETED').length,
    },
  }
}

import { Prisma } from '@prisma/client'

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

type DriverRow = {
  id: string
  name: string
  avatarPath: string | null
  driverProfile: { vehicleInfo: Prisma.JsonValue } | null
}

type PassengerRow = {
  id: string
  name: string
  avatarPath: string | null
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
    id: driver.id,
    name: driver.name,
    avatarUrl: driver.avatarPath ?? null,
    vehicle: parseVehicle(driver.driverProfile?.vehicleInfo ?? null),
  }
}

function mapPassengerForApi(passenger: PassengerRow) {
  return {
    id: passenger.id,
    name: passenger.name,
    avatarUrl: passenger.avatarPath ?? null,
  }
}

function toDecimalString(value: Prisma.Decimal | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return '0.00'
  }

  return new Prisma.Decimal(value).toString()
}

export function serializeRideList(ride: {
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
}) {
  return {
    id: ride.id,
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
  bookings: Array<{
    id: string
    seatsBooked: number
    status: string
    totalFare: Prisma.Decimal
    driverEarnings: Prisma.Decimal
    passenger: PassengerRow
    review: {
      id: string
      rating: number
      comment: string | null
      createdAt: Date
    } | null
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
    bookings: ride.bookings.map((booking) => ({
      id: booking.id,
      seatsBooked: booking.seatsBooked,
      status: booking.status,
      totalFare: toDecimalString(booking.totalFare),
      driverEarnings: toDecimalString(booking.driverEarnings),
      passenger: mapPassengerForApi(booking.passenger),
      review: booking.review
        ? {
            id: booking.review.id,
            rating: booking.review.rating,
            comment: booking.review.comment,
            createdAt: booking.review.createdAt.toISOString(),
          }
        : null,
    })),
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

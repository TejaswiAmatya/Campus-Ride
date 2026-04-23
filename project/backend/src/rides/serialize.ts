import type { Prisma } from '@prisma/client'

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

type DriverRow = {
  id: string
  name: string
  avatarPath: string | null
  driverProfile: { vehicleInfo: Prisma.JsonValue } | null
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

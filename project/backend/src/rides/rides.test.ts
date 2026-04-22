import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { CreateRideSchema, SearchRidesSchema, UpdateRideStatusSchema } from './schemas'
import { requireAuth, requireRole } from '../middleware/auth'
import { createRide, searchRides } from './controller'

const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

const validRide = {
  origin: {
    address: '1 University Drive',
    lat: 58.9,
    lng: 5.7,
  },
  destination: {
    address: 'Central Station',
    lat: 58.97,
    lng: 5.73,
  },
  departureTime: futureDate,
  totalSeats: 3,
  pricePerSeat: 80,
}

type UserRecord = {
  id: string
  name: string
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN'
  isDriverApproved: boolean
  avatarUrl?: string | null
}

type RideRecord = {
  id: string
  driverId: string
  originAddress: string
  originLat: number
  originLng: number
  destinationAddress: string
  destinationLat: number
  destinationLng: number
  departureTime: Date
  totalSeats: number
  availableSeats: number
  pricePerSeat: number
  status: 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
}

const testState: { users: UserRecord[]; rides: RideRecord[] } = {
  users: [],
  rides: [],
}

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(async (token: string) => {
        const userIdByToken: Record<string, string> = {
          'driver-token': 'driver-1',
          'passenger-token': 'passenger-1',
        }
        const userId = userIdByToken[token]

        if (!userId) {
          return { data: { user: null }, error: new Error('invalid token') }
        }

        return { data: { user: { id: userId } }, error: null }
      }),
    },
  },
}))

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const user = testState.users.find((entry) => entry.id === where.id)
        return user ? { role: user.role } : null
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const user = testState.users.find((entry) => entry.id === where.id)
        if (!user) {
          const error = new Error('Record not found') as Error & { code: string }
          error.code = 'P2025'
          throw error
        }

        return { isDriverApproved: user.isDriverApproved }
      }),
    },
    ride: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: Omit<RideRecord, 'id' | 'status'>
        }) => {
          const ride: RideRecord = {
            id: `ride-${testState.rides.length + 1}`,
            status: 'OPEN',
            ...data,
          }
          testState.rides.push(ride)

          const driver = testState.users.find((entry) => entry.id === ride.driverId)

          return {
            ...ride,
            driver: driver
              ? { id: driver.id, name: driver.name, avatarUrl: driver.avatarUrl ?? null }
              : null,
          }
        },
      ),
      findMany: vi.fn(async ({ where }: { where: { status?: string; departureTime?: { gte: Date; lt: Date }; OR?: Array<{ originAddress?: { contains: string }; destinationAddress?: { contains: string } }> } }) => {
        return testState.rides
          .filter((ride) => {
            if (where.status && ride.status !== where.status) {
              return false
            }

            if (where.departureTime) {
              const departureTime = ride.departureTime.getTime()
              if (
                departureTime < where.departureTime.gte.getTime() ||
                departureTime >= where.departureTime.lt.getTime()
              ) {
                return false
              }
            }

            if (where.OR?.length) {
              const matches = where.OR.some((clause) => {
                if (clause.originAddress) {
                  return ride.originAddress.toLowerCase().includes(clause.originAddress.contains.toLowerCase())
                }

                if (clause.destinationAddress) {
                  return ride.destinationAddress
                    .toLowerCase()
                    .includes(clause.destinationAddress.contains.toLowerCase())
                }

                return false
              })

              if (!matches) {
                return false
              }
            }

            return true
          })
          .sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime())
          .map((ride) => {
            const driver = testState.users.find((entry) => entry.id === ride.driverId)

            return {
              ...ride,
              driver: driver
                ? { id: driver.id, name: driver.name, avatarUrl: driver.avatarUrl ?? null }
                : null,
            }
          })
      }),
      findUniqueOrThrow: vi.fn(),
    },
  },
}))

beforeEach(() => {
  testState.users = [
    { id: 'driver-1', name: 'Dana Driver', role: 'DRIVER', isDriverApproved: true },
    { id: 'passenger-1', name: 'Pat Passenger', role: 'PASSENGER', isDriverApproved: false },
  ]
  testState.rides = []
})

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
    expect(
      CreateRideSchema.safeParse({
        ...validRide,
        origin: { ...validRide.origin, lat: 91 },
      }).success,
    ).toBe(false)
  })

  it('rejects an out-of-range longitude', () => {
    expect(
      CreateRideSchema.safeParse({
        ...validRide,
        origin: { ...validRide.origin, lng: 181 },
      }).success,
    ).toBe(false)
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

  it('accepts a location query', () => {
    const result = SearchRidesSchema.safeParse({ location: 'Central Station' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.location).toBe('Central Station')
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

describe('rides API integration', () => {
  it('posts a ride and returns it from search with the correct seat count', async () => {
    const createResponse = await runHandlers(
      [requireAuth, requireRole('DRIVER'), createRide],
      {
        method: 'POST',
        headers: { authorization: 'Bearer driver-token' },
        body: validRide,
      },
    )

    expect(createResponse.statusCode).toBe(201)
    expect(createResponse.body.data.availableSeats).toBe(3)
    expect(createResponse.body.data.totalSeats).toBe(3)

    const searchResponse = await runHandlers([searchRides], {
      method: 'GET',
      query: {
        date: validRide.departureTime.slice(0, 10),
        location: 'central',
      },
    })

    expect(searchResponse.statusCode).toBe(200)
    expect(searchResponse.body.data).toHaveLength(1)
    expect(searchResponse.body.data[0]).toMatchObject({
      id: createResponse.body.data.id,
      availableSeats: 3,
      totalSeats: 3,
      originAddress: validRide.origin.address,
      destinationAddress: validRide.destination.address,
    })
  })

  it('rejects ride creation for a non-driver JWT role', async () => {
    const response = await runHandlers(
      [requireAuth, requireRole('DRIVER'), createRide],
      {
        method: 'POST',
        headers: { authorization: 'Bearer passenger-token' },
        body: validRide,
      },
    )

    expect(response.statusCode).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })
})

async function runHandlers(
  handlers: Array<(req: Request, res: Response, next: NextFunction) => void | Promise<void>>,
  init: {
    method: string
    headers?: Record<string, string>
    body?: unknown
    query?: Record<string, string>
    params?: Record<string, string>
  },
) {
  const req = {
    method: init.method,
    headers: init.headers ?? {},
    body: init.body ?? {},
    query: init.query ?? {},
    params: init.params ?? {},
  } as Request

  let statusCode = 200
  let payload: unknown

  const res = {
    status(code: number) {
      statusCode = code
      return this
    },
    json(data: unknown) {
      payload = data
      return this
    },
  } as Response

  for (const handler of handlers) {
    let nextCalled = false
    let nextError: unknown

    await handler(req, res, (error?: unknown) => {
      nextCalled = true
      nextError = error
    })

    if (nextError) {
      throw nextError
    }

    if (!nextCalled) {
      break
    }
  }

  return {
    statusCode,
    body: payload as Record<string, unknown>,
  }
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreateRideSchema,
  SearchRidesSchema,
  UpdateRideStatusSchema,
} from "./schemas";
import { requireAuth, requireRole } from "../middleware/auth";
import { createRide,getMyRides, searchRides,updateRideStatus,} from "./controller";
import { searchRidesByLocation } from "./location.service";
import { prisma } from "../lib/prisma";
import { errorHandler } from "../middleware/error";

const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

const validRide = {
  origin: {
    address: "1 University Drive",
    lat: 58.9,
    lng: 5.7,
  },
  destination: {
    address: "Central Station",
    lat: 58.97,
    lng: 5.73,
  },
  departureTime: futureDate,
  totalSeats: 3,
  pricePerSeat: 80,
};

type UserRecord = {
  id: string;
  name: string;
  role: "PASSENGER" | "DRIVER" | "ADMIN";
  isDriverApproved: boolean;
  avatarUrl?: string | null;
};

type RideRecord = {
  id: string;
  driverId: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  departureTime: Date;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: Prisma.Decimal;
  status: "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
};

type BookingRecord = {
  id: string;
  rideId: string;
  passengerId: string;
  seatsBooked: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  createdAt: Date;
};

type RideSearchWhere = {
  status?: string;
  availableSeats?: { gte: number };
  departureTime?: { gte: Date; lt: Date };
  id?: { in: string[] };
  driverId?: string;
};

const testState: {
  users: UserRecord[];
  rides: RideRecord[];
  bookings: BookingRecord[];
} = {
  users: [],
  rides: [],
  bookings: [],
};

vi.mock("../lib/supabase", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(async (token: string) => {
        const userIdByToken: Record<string, string> = {
          "driver-token": "driver-1",
          "driver-2-token": "driver-2",
          "passenger-token": "passenger-1",
        };
        const userId = userIdByToken[token];

        if (!userId) {
          return { data: { user: null }, error: new Error("invalid token") };
        }

        return { data: { user: { id: userId } }, error: null };
      }),
    },
  },
}));

const { notifyRideStatusMock } = vi.hoisted(() => ({
  notifyRideStatusMock: vi.fn(),
}));

vi.mock("../lib/notify", () => ({
  notify: {
    rideStatus: notifyRideStatusMock,
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const user = testState.users.find((entry) => entry.id === where.id);
        return user ? { role: user.role } : null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const user = testState.users.find((entry) => entry.id === where.id);
        if (!user) {
          const error = new Error("Record not found") as Error & {
            code: string;
          };
          error.code = "P2025";
          throw error;
        }

        return { isDriverApproved: user.isDriverApproved };
      }),
    },
    $queryRaw: vi.fn(async () => {
      return testState.rides
        .filter((ride) => ride.status === "OPEN")
        .map((ride) => ({ id: ride.id, sortDistanceMeters: 0 }));
    }),
    ride: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: Omit<
            RideRecord,
            "id" | "status" | "createdAt" | "updatedAt" | "pricePerSeat"
          > & { pricePerSeat: number | Prisma.Decimal };
        }) => {
          const now = new Date();
          const ride: RideRecord = {
            id: `ride-${testState.rides.length + 1}`,
            status: "OPEN",
            ...data,
            pricePerSeat:
              data.pricePerSeat instanceof Prisma.Decimal
                ? data.pricePerSeat
                : new Prisma.Decimal(data.pricePerSeat),
            createdAt: now,
            updatedAt: now,
          };
          testState.rides.push(ride);

          const driver = testState.users.find(
            (entry) => entry.id === ride.driverId,
          );

          return {
            ...ride,
            driver: driver
              ? {
                  id: driver.id,
                  name: driver.name,
                  avatarUrl: driver.avatarUrl ?? null,
                }
              : null,
          };
        },
      ),
      findMany: vi.fn(async ({ where }: { where: RideSearchWhere }) => {
        return testState.rides
          .filter((ride) => {
            if (where.status && ride.status !== where.status) {
              return false;
            }

            if (
              where.availableSeats &&
              ride.availableSeats < where.availableSeats.gte
            ) {
              return false;
            }

            if (where.departureTime) {
              const departureTime = ride.departureTime.getTime();
              if (
                departureTime < where.departureTime.gte.getTime() ||
                departureTime >= where.departureTime.lt.getTime()
              ) {
                return false;
              }
            }

            if (where.id?.in && !where.id.in.includes(ride.id)) {
              return false;
            }

            if (where.driverId && ride.driverId !== where.driverId) {
              return false;
            }

            return true;
          })
          .sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime())
          .map((ride) => {
            const driver = testState.users.find(
              (entry) => entry.id === ride.driverId,
            );
            const bookings = testState.bookings
              .filter((booking) => booking.rideId === ride.id)
              .map((booking) => {
                const passenger = testState.users.find(
                  (entry) => entry.id === booking.passengerId,
                );

                return {
                  ...booking,
                  passenger: passenger
                    ? {
                        id: passenger.id,
                        name: passenger.name,
                        avatarPath: passenger.avatarUrl ?? null,
                      }
                    : null,
                };
              });

            return {
              ...ride,
              driver: driver
                ? {
                    id: driver.id,
                    name: driver.name,
                    avatarPath: driver.avatarUrl ?? null,
                    driverProfile: { vehicleInfo: null },
                  }
                : null,
              bookings,
              _count: { bookings: bookings.length },
            };
          });
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const ride = testState.rides.find((entry) => entry.id === where.id);

        if (!ride) {
          const error = new Error("Record not found") as Error & {
            code: string;
          };
          error.code = "P2025";
          throw error;
        }

        const driver = testState.users.find(
          (entry) => entry.id === ride.driverId,
        );

        return {
          ...ride,
          driver: driver
            ? {
                id: driver.id,
                name: driver.name,
                avatarUrl: driver.avatarUrl ?? null,
              }
            : null,
        };
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status: RideRecord["status"] };
        }) => {
          const ride = testState.rides.find((entry) => entry.id === where.id);

          if (!ride) {
            const error = new Error("Record not found") as Error & {
              code: string;
            };
            error.code = "P2025";
            throw error;
          }

          ride.status = data.status;
          const driver = testState.users.find(
            (entry) => entry.id === ride.driverId,
          );

          return {
            ...ride,
            driver: driver
              ? {
                  id: driver.id,
                  name: driver.name,
                  avatarUrl: driver.avatarUrl ?? null,
                }
              : null,
          };
        },
      ),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  testState.users = [
    {
      id: "driver-1",
      name: "Dana Driver",
      role: "DRIVER",
      isDriverApproved: true,
    },
    {
      id: "passenger-1",
      name: "Pat Passenger",
      role: "PASSENGER",
      isDriverApproved: false,
    },
  ];
  testState.rides = [];
  testState.bookings = [];
  notifyRideStatusMock.mockReset();
});

describe("searchRidesByLocation", () => {
  const osloLat = 59.9139;
  const osloLng = 10.7522;

  it("uses $queryRaw when coordinates are provided", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { id: "ride-1", sortDistanceMeters: 500 },
    ]);
    vi.mocked(prisma.ride.findMany).mockResolvedValueOnce([] as RideRecord[]);

    await searchRidesByLocation({
      originLat: osloLat,
      originLng: osloLng,
      seats: 1,
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("skips $queryRaw when no coordinates are provided", async () => {
    vi.mocked(prisma.ride.findMany).mockResolvedValueOnce([] as RideRecord[]);

    await searchRidesByLocation({ seats: 1 });

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.ride.findMany).toHaveBeenCalledTimes(1);
  });

  it("excludes rides outside the radius", async () => {
    const nearbyRide: RideRecord = {
      id: "nearby-ride",
      driverId: "driver-1",
      originAddress: "Oslo S",
      originLat: osloLat,
      originLng: osloLng,
      destinationAddress: "Majorstuen",
      destinationLat: 59.93,
      destinationLng: 10.71,
      departureTime: new Date(futureDate),
      totalSeats: 3,
      availableSeats: 3,
      pricePerSeat: new Prisma.Decimal(80),
      status: "OPEN",
      createdAt: new Date(futureDate),
      updatedAt: new Date(futureDate),
    };

    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { id: "nearby-ride", sortDistanceMeters: 800 },
    ]);
    vi.mocked(prisma.ride.findMany).mockResolvedValueOnce([nearbyRide]);

    const results = await searchRidesByLocation({
      originLat: osloLat,
      originLng: osloLng,
      seats: 1,
      radiusKm: 1,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("nearby-ride");
    expect(prisma.ride.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["nearby-ride"] } }),
      }),
    );
  });

  it("findMany re-applies safety constraints", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { id: "ride-1", sortDistanceMeters: 500 },
    ]);
    vi.mocked(prisma.ride.findMany).mockResolvedValueOnce([] as RideRecord[]);

    await searchRidesByLocation({
      originLat: osloLat,
      originLng: osloLng,
      seats: 2,
    });

    expect(prisma.ride.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "OPEN",
          availableSeats: { gte: 2 },
        }),
      }),
    );
  });

  it("returns empty array immediately when $queryRaw returns nothing", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

    const results = await searchRidesByLocation({
      originLat: osloLat,
      originLng: osloLng,
      seats: 1,
    });

    expect(results).toEqual([]);
    expect(prisma.ride.findMany).not.toHaveBeenCalled();
  });
});

describe("CreateRideSchema", () => {
  it("accepts a valid ride", () => {
    expect(CreateRideSchema.safeParse(validRide).success).toBe(true);
  });

  it("rejects zero seats", () => {
    expect(
      CreateRideSchema.safeParse({ ...validRide, totalSeats: 0 }).success,
    ).toBe(false);
  });

  it("rejects more than 8 seats", () => {
    expect(
      CreateRideSchema.safeParse({ ...validRide, totalSeats: 9 }).success,
    ).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(
      CreateRideSchema.safeParse({ ...validRide, pricePerSeat: -10 }).success,
    ).toBe(false);
  });

  it("rejects a zero price", () => {
    expect(
      CreateRideSchema.safeParse({ ...validRide, pricePerSeat: 0 }).success,
    ).toBe(false);
  });

  it("rejects an invalid datetime", () => {
    expect(
      CreateRideSchema.safeParse({ ...validRide, departureTime: "2024-13-45" })
        .success,
    ).toBe(false);
  });

  it("rejects an out-of-range latitude", () => {
    expect(
      CreateRideSchema.safeParse({
        ...validRide,
        origin: { ...validRide.origin, lat: 91 },
      }).success,
    ).toBe(false);
  });

  it("rejects an out-of-range longitude", () => {
    expect(
      CreateRideSchema.safeParse({
        ...validRide,
        origin: { ...validRide.origin, lng: 181 },
      }).success,
    ).toBe(false);
  });
});

describe("SearchRidesSchema", () => {
  it("accepts an empty query (no filters)", () => {
    expect(SearchRidesSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a valid date string", () => {
    expect(SearchRidesSchema.safeParse({ date: "2025-06-15" }).success).toBe(
      true,
    );
  });

  it("rejects a bad date format", () => {
    expect(SearchRidesSchema.safeParse({ date: "15-06-2025" }).success).toBe(
      false,
    );
  });

  it("accepts a location query", () => {
    const result = SearchRidesSchema.safeParse({
      originLat: "58.9",
      originLng: "5.7",
      destLat: "58.97",
      destLng: "5.73",
      seats: "2",
      radiusKm: "8",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.originLat).toBe(58.9);
      expect(result.data.seats).toBe(2);
      expect(result.data.radiusKm).toBe(8);
    }
  });

  it("rejects incomplete origin coordinates", () => {
    expect(SearchRidesSchema.safeParse({ originLat: "58.9" }).success).toBe(
      false,
    );
  });

  it("rejects incomplete destination coordinates", () => {
    expect(SearchRidesSchema.safeParse({ destLat: "58.97" }).success).toBe(
      false,
    );
  });
});

describe("UpdateRideStatusSchema", () => {
  it("accepts ACTIVE", () => {
    expect(UpdateRideStatusSchema.safeParse({ status: "ACTIVE" }).success).toBe(
      true,
    );
  });

  it("accepts COMPLETED", () => {
    expect(
      UpdateRideStatusSchema.safeParse({ status: "COMPLETED" }).success,
    ).toBe(true);
  });

  it("accepts CANCELLED", () => {
    expect(
      UpdateRideStatusSchema.safeParse({ status: "CANCELLED" }).success,
    ).toBe(true);
  });

  it("rejects OPEN (driver cannot re-open a ride)", () => {
    expect(UpdateRideStatusSchema.safeParse({ status: "OPEN" }).success).toBe(
      false,
    );
  });
});

describe("rides API integration", () => {
  it("returns the driver's rides with booking request details", async () => {
    const departureTime = new Date(futureDate);
    testState.rides.push({
      id: "ride-mine-1",
      driverId: "driver-1",
      originAddress: "University",
      originLat: 58.9,
      originLng: 5.7,
      destinationAddress: "Station",
      destinationLat: 58.97,
      destinationLng: 5.73,
      departureTime,
      totalSeats: 3,
      availableSeats: 1,
      pricePerSeat: new Prisma.Decimal(80),
      status: "OPEN",
      createdAt: departureTime,
      updatedAt: departureTime,
    });
    testState.bookings.push({
      id: "booking-1",
      rideId: "ride-mine-1",
      passengerId: "passenger-1",
      seatsBooked: 2,
      status: "PENDING",
      createdAt: departureTime,
    });

    const response = await runHandlers([requireAuth, getMyRides], {
      method: "GET",
      headers: { authorization: "Bearer driver-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toMatchObject([
      {
        id: "ride-mine-1",
        _count: { bookings: 1 },
        bookings: [
          {
            id: "booking-1",
            seatsBooked: 2,
            status: "PENDING",
            passenger: {
              id: "passenger-1",
              name: "Pat Passenger",
            },
          },
        ],
      },
    ]);
  });

  it("posts a ride and returns it from search with the correct seat count", async () => {
    const createResponse = await runHandlers(
      [requireAuth, requireRole("DRIVER"), createRide],
      {
        method: "POST",
        headers: { authorization: "Bearer driver-token" },
        body: validRide,
      },
    );

    const createdRide = createResponse.body.data as RideRecord;

    expect(createResponse.statusCode).toBe(201);
    expect(createdRide.availableSeats).toBe(3);
    expect(createdRide.totalSeats).toBe(3);

    const searchResponse = await runHandlers([searchRides], {
      method: "GET",
      query: {
        date: validRide.departureTime.slice(0, 10),
        originLat: String(validRide.origin.lat),
        originLng: String(validRide.origin.lng),
        destLat: String(validRide.destination.lat),
        destLng: String(validRide.destination.lng),
        seats: "2",
      },
    });

    const foundRides = searchResponse.body.data as RideRecord[];

    expect(searchResponse.statusCode).toBe(200);
    expect(foundRides).toHaveLength(1);
    expect(foundRides[0]).toMatchObject({
      id: createdRide.id,
      availableSeats: 3,
      totalSeats: 3,
      originAddress: validRide.origin.address,
      destinationAddress: validRide.destination.address,
    });
  });

  it("rejects ride creation for a non-driver JWT role", async () => {
    const response = await runHandlers(
      [requireAuth, requireRole("DRIVER"), createRide],
      {
        method: "POST",
        headers: { authorization: "Bearer passenger-token" },
        body: validRide,
      },
    );

    expect(response.statusCode).toBe(403);
    expect((response.body.error as { code: string }).code).toBe("FORBIDDEN");
  });

  it("allows the ride driver to start and complete a ride", async () => {
    const createResponse = await runHandlers(
      [requireAuth, requireRole("DRIVER"), createRide],
      {
        method: "POST",
        headers: { authorization: "Bearer driver-token" },
        body: validRide,
      },
    );

    const createdRide = createResponse.body.data as RideRecord;

    const startResponse = await runHandlers(
      [requireAuth, requireRole("DRIVER"), updateRideStatus],
      {
        method: "PATCH",
        headers: { authorization: "Bearer driver-token" },
        params: { id: createdRide.id },
        body: { status: "ACTIVE" },
      },
    );

    expect(startResponse.statusCode).toBe(200);
    expect((startResponse.body.data as RideRecord).status).toBe("IN_PROGRESS");
    expect(notifyRideStatusMock).toHaveBeenCalledWith(createdRide.id, {
      rideId: createdRide.id,
      bookingId: "",
      status: "in_progress",
    });

    const completeResponse = await runHandlers(
      [requireAuth, requireRole("DRIVER"), updateRideStatus],
      {
        method: "PATCH",
        headers: { authorization: "Bearer driver-token" },
        params: { id: createdRide.id },
        body: { status: "COMPLETED" },
      },
    );

    expect(completeResponse.statusCode).toBe(200);
    expect((completeResponse.body.data as RideRecord).status).toBe("COMPLETED");
  });

  it("rejects illegal status transitions", async () => {
    const createResponse = await runHandlers(
      [requireAuth, requireRole("DRIVER"), createRide],
      {
        method: "POST",
        headers: { authorization: "Bearer driver-token" },
        body: validRide,
      },
    );

    const createdRide = createResponse.body.data as RideRecord;

    const response = await runHandlers(
      [requireAuth, requireRole("DRIVER"), updateRideStatus],
      {
        method: "PATCH",
        headers: { authorization: "Bearer driver-token" },
        params: { id: createdRide.id },
        body: { status: "COMPLETED" },
      },
    );

    expect(response.statusCode).toBe(409);
    expect((response.body.error as { code: string }).code).toBe(
      "INVALID_STATUS_TRANSITION",
    );
  });

  it("rejects status updates from another driver", async () => {
    testState.users.push({
      id: "driver-2",
      name: "Devon Driver",
      role: "DRIVER",
      isDriverApproved: true,
    });

    const createResponse = await runHandlers(
      [requireAuth, requireRole("DRIVER"), createRide],
      {
        method: "POST",
        headers: { authorization: "Bearer driver-token" },
        body: validRide,
      },
    );

    const createdRide = createResponse.body.data as RideRecord;

    const response = await runHandlers(
      [requireAuth, requireRole("DRIVER"), updateRideStatus],
      {
        method: "PATCH",
        params: { id: createdRide.id },
        body: { status: "ACTIVE" },
        headers: { authorization: "Bearer driver-2-token" },
      },
    );

    expect(response.statusCode).toBe(403);
    expect((response.body.error as { code: string }).code).toBe("FORBIDDEN");
  });
});

async function runHandlers(
  handlers: Array<
    (req: Request, res: Response, next: NextFunction) => void | Promise<void>
  >,
  init: {
    method: string;
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
    params?: Record<string, string>;
  },
) {
  const req = {
    method: init.method,
    headers: init.headers ?? {},
    body: init.body ?? {},
    query: init.query ?? {},
    params: init.params ?? {},
  } as Request;

  let statusCode = 200;
  let payload: unknown;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      payload = data;
      return this;
    },
  } as Response;

  const reqUser =
    init.headers?.authorization === "Bearer driver-token"
      ? { id: "driver-1", role: "DRIVER" }
      : init.headers?.authorization === "Bearer driver-2-token"
        ? { id: "driver-2", role: "DRIVER" }
        : init.headers?.authorization === "Bearer passenger-token"
          ? { id: "passenger-1", role: "PASSENGER" }
          : undefined;

  req.user = reqUser;

  for (const handler of handlers) {
    let nextCalled = false;
    let nextError: unknown;

    await handler(req, res, (error?: unknown) => {
      nextCalled = true;
      nextError = error;
    });

    if (nextError) {
      errorHandler(nextError, req, res, () => {});
      break;
    }

    if (!nextCalled) {
      break;
    }
  }

  return {
    statusCode,
    body: payload as Record<string, unknown>,
  };
}

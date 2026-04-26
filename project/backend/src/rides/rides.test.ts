import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreateRideSchema,
  CreateRideReviewSchema,
  SearchRidesSchema,
  UpdateRideStatusSchema,
} from "./schemas";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  cancelRide,
  createRide,
  getMyRides,
  searchRides,
  startRide,
  updateRideStatus,
} from "./controller";
import { searchRidesByLocation } from "./location";
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
  accountStatus?: "ACTIVE" | "WARNED" | "SUSPENDED" | "BANNED";
  suspendedUntil?: Date | null;
  driverProfileStatus?: "PENDING" | "APPROVED" | "REJECTED";
  cancellationStrikes?: number;
  avatarUrl?: string | null;
};

type RideRecord = {
  id: string;
  driverId: string;
  rideSeriesId: string | null;
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
  detourFlexibilityKm: number;
  preferences: string[];
  routePolyline: string | null;
  routeDistanceKm: number | null;
  routeDurationMinutes: number | null;
  recurrencePattern: "NONE" | "DAILY" | "WEEKLY" | "SPECIFIC_DAYS";
  recurrenceDays: number[];
  recurrenceInstanceAt: Date | null;
  stops: Array<{
    id?: string;
    address: string;
    lat: number;
    lng: number;
    orderIndex: number;
  }>;
  status: "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
  driver?: {
    id: string;
    name: string;
    avatarPath: string | null;
    driverProfile: { vehicleInfo: Prisma.JsonValue } | null;
    reviewsReceived: Array<{ rating: number }>;
  };
};

function makeRideRecord(
  overrides: Partial<RideRecord> & Pick<RideRecord, "id" | "driverId">,
): RideRecord {
  const departureTime = overrides.departureTime ?? new Date(futureDate);

  return {
    id: overrides.id,
    driverId: overrides.driverId,
    rideSeriesId: overrides.rideSeriesId ?? null,
    originAddress: overrides.originAddress ?? "University",
    originLat: overrides.originLat ?? 58.9,
    originLng: overrides.originLng ?? 5.7,
    destinationAddress: overrides.destinationAddress ?? "Station",
    destinationLat: overrides.destinationLat ?? 58.97,
    destinationLng: overrides.destinationLng ?? 5.73,
    departureTime,
    totalSeats: overrides.totalSeats ?? 3,
    availableSeats: overrides.availableSeats ?? 3,
    pricePerSeat: overrides.pricePerSeat ?? new Prisma.Decimal(80),
    detourFlexibilityKm: overrides.detourFlexibilityKm ?? 0,
    preferences: overrides.preferences ?? [],
    routePolyline: overrides.routePolyline ?? null,
    routeDistanceKm: overrides.routeDistanceKm ?? null,
    routeDurationMinutes: overrides.routeDurationMinutes ?? null,
    recurrencePattern: overrides.recurrencePattern ?? "NONE",
    recurrenceDays: overrides.recurrenceDays ?? [],
    recurrenceInstanceAt: overrides.recurrenceInstanceAt ?? null,
    stops: overrides.stops ?? [],
    status: overrides.status ?? "OPEN",
    createdAt: overrides.createdAt ?? departureTime,
    updatedAt: overrides.updatedAt ?? departureTime,
    driver: overrides.driver,
  };
}

type BookingRecord = {
  id: string;
  rideId: string;
  passengerId: string;
  seatsBooked: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  createdAt: Date;
};

type ReviewRecord = {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
};

type RideSearchWhere = {
  status?: string;
  availableSeats?: { gte: number };
  pricePerSeat?: { gte?: number; lte?: number };
  departureTime?: { gte?: Date; lt?: Date; lte?: Date };
  id?: { in: string[] };
  driverId?: string;
};

const testState: {
  users: UserRecord[];
  rides: RideRecord[];
  bookings: BookingRecord[];
  reviews: ReviewRecord[];
} = {
  users: [],
  rides: [],
  bookings: [],
  reviews: [],
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

const { notifyRideStatusMock, notifyBookingStatusMock, queueRideStartedMock } = vi.hoisted(() => ({
  notifyRideStatusMock: vi.fn(),
  notifyBookingStatusMock: vi.fn(),
  queueRideStartedMock: vi.fn(),
}));

vi.mock("../lib/notify", () => ({
  notify: {
    rideStatus: notifyRideStatusMock,
    bookingStatus: notifyBookingStatusMock,
  },
}));

vi.mock("../lib/emailQueue", () => ({
  emailQueue: {
    rideStarted: queueRideStartedMock,
    rideUpdated: vi.fn(),
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        ride: {
          findUnique: async ({ where }: { where: { id: string } }) => {
            const ride = testState.rides.find((entry) => entry.id === where.id);

            if (!ride) {
              return null;
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
                    avatarPath: driver.avatarUrl ?? null,
                    driverProfile: { vehicleInfo: null },
                  }
                : null,
              bookings: testState.bookings
                .filter((booking) => booking.rideId === ride.id)
                .map((booking) => ({ ...booking })),
            };
          },
          update: async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<Pick<RideRecord, "status" | "availableSeats">>;
          }) => {
            const ride = testState.rides.find((entry) => entry.id === where.id);

            if (!ride) {
              const error = new Error("Record not found") as Error & {
                code: string;
              };
              error.code = "P2025";
              throw error;
            }

            if (data.status) {
              ride.status = data.status;
            }
            if (typeof data.availableSeats === "number") {
              ride.availableSeats = data.availableSeats;
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
                    avatarPath: driver.avatarUrl ?? null,
                    driverProfile: { vehicleInfo: null },
                  }
                : null,
            };
          },
        },
        booking: {
          updateMany: async ({
            where,
            data,
          }: {
            where: { rideId: string; status: BookingRecord["status"] };
            data: { status: BookingRecord["status"] };
          }) => {
            let count = 0;

            testState.bookings.forEach((booking) => {
              if (
                booking.rideId === where.rideId &&
                booking.status === where.status
              ) {
                booking.status = data.status;
                count += 1;
              }
            });

            return { count };
          },
        },
        driverProfile: {
          updateMany: async ({
            where,
          }: {
            where: { userId: string };
            data: { cancellationStrikes: { increment: number } };
          }) => {
            const driver = testState.users.find(
              (entry) => entry.id === where.userId,
            );

            if (driver) {
              driver.cancellationStrikes =
                (driver.cancellationStrikes ?? 0) + 1;
            }

            return { count: driver ? 1 : 0 };
          },
        },
      }),
    ),
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const user = testState.users.find((entry) => entry.id === where.id);
        return user
          ? {
              role: user.role,
              accountStatus: user.accountStatus ?? "ACTIVE",
              suspendedUntil: user.suspendedUntil ?? null,
            }
          : null;
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

        return {
          role: user.role,
          driverProfile: user.driverProfileStatus
            ? { status: user.driverProfileStatus }
            : null,
        };
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
          const nestedStops = (
            data as {
              stops?: { create?: Array<{ address: string; lat: number; lng: number; orderIndex: number }> };
            }
          ).stops?.create;
          const createdStops = Array.isArray((data as { stops?: unknown }).stops)
            ? ((data as { stops: RideRecord["stops"] }).stops ?? [])
            : (nestedStops ?? []).map((stop) => ({
                ...stop,
                id: `stop-${testState.rides.length + 1}-${stop.orderIndex}`,
              }));
          const ride: RideRecord = {
            id: `ride-${testState.rides.length + 1}`,
            status: "OPEN",
            ...data,
            pricePerSeat:
              data.pricePerSeat instanceof Prisma.Decimal
                ? data.pricePerSeat
                : new Prisma.Decimal(data.pricePerSeat),
            stops: createdStops,
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
                  avatarPath: driver.avatarUrl ?? null,
                  driverProfile: { vehicleInfo: null },
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

            if (where.pricePerSeat) {
              const price = Number(ride.pricePerSeat);
              if (
                where.pricePerSeat.gte !== undefined &&
                price < where.pricePerSeat.gte
              ) {
                return false;
              }
              if (
                where.pricePerSeat.lte !== undefined &&
                price > where.pricePerSeat.lte
              ) {
                return false;
              }
            }

            if (where.departureTime) {
              const departureTime = ride.departureTime.getTime();
              if (
                (where.departureTime.gte &&
                  departureTime < where.departureTime.gte.getTime()) ||
                (where.departureTime.lt &&
                  departureTime >= where.departureTime.lt.getTime()) ||
                (where.departureTime.lte &&
                  departureTime > where.departureTime.lte.getTime())
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
            const reviewsReceived = testState.reviews
              .filter((review) => review.revieweeId === ride.driverId)
              .map((review) => ({ rating: review.rating }));

            return {
              ...ride,
              driver: driver
                ? {
                    id: driver.id,
                    name: driver.name,
                    avatarPath: driver.avatarUrl ?? null,
                    driverProfile: { vehicleInfo: null },
                    reviewsReceived,
                  }
                : null,
              stops: ride.stops ?? [],
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
        const bookings = testState.bookings
          .filter((booking) => booking.rideId === ride.id)
          .map((booking) => ({ ...booking }));

        return {
          ...ride,
          driver: driver
            ? {
                id: driver.id,
                name: driver.name,
                avatarUrl: driver.avatarUrl ?? null,
              }
            : null,
          bookings,
        };
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const ride = testState.rides.find((entry) => entry.id === where.id);

        if (!ride) {
          return null;
        }

        const driver = testState.users.find((entry) => entry.id === ride.driverId);

        return {
          ...ride,
          driver: driver
            ? {
                id: driver.id,
                name: driver.name,
                avatarPath: driver.avatarUrl ?? null,
                driverProfile: { vehicleInfo: null },
                reviewsReceived: testState.reviews
                  .filter((review) => review.revieweeId === ride.driverId)
                  .map((review) => ({ rating: review.rating })),
              }
            : null,
          stops: ride.stops ?? [],
          bookings: testState.bookings
            .filter((booking) => booking.rideId === ride.id)
            .map((booking) => ({ ...booking })),
        };
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<Pick<RideRecord, "status" | "availableSeats">>;
        }) => {
          const ride = testState.rides.find((entry) => entry.id === where.id);

          if (!ride) {
            const error = new Error("Record not found") as Error & {
              code: string;
            };
            error.code = "P2025";
            throw error;
          }

          if (data.status) {
            ride.status = data.status;
          }
          if (typeof data.availableSeats === "number") {
            ride.availableSeats = data.availableSeats;
          }
          const driver = testState.users.find((entry) => entry.id === ride.driverId);

          return {
            ...ride,
            driver: driver
              ? {
                  id: driver.id,
                  name: driver.name,
                  avatarPath: driver.avatarUrl ?? null,
                  driverProfile: { vehicleInfo: null },
                  reviewsReceived: testState.reviews
                    .filter((review) => review.revieweeId === ride.driverId)
                    .map((review) => ({ rating: review.rating })),
                }
              : null,
            stops: ride.stops ?? [],
          };
        },
      ),
    },
    booking: {
      updateMany: vi.fn(),
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
      driverProfileStatus: "APPROVED",
      cancellationStrikes: 0,
    },
    {
      id: "passenger-1",
      name: "Pat Passenger",
      role: "PASSENGER",
    },
  ];
  testState.rides = [];
  testState.bookings = [];
  testState.reviews = [];
  notifyRideStatusMock.mockReset();
  notifyBookingStatusMock.mockReset();
  queueRideStartedMock.mockReset();
});

describe("searchRidesByLocation", () => {
  it("ranks rides by route fit, stops, timing, and preferences", async () => {
    const departureTime = new Date(futureDate);
    testState.users.push({
      id: "driver-2",
      name: "Devon Driver",
      role: "DRIVER",
      driverProfileStatus: "APPROVED",
      cancellationStrikes: 0,
    });

    testState.rides.push(
      makeRideRecord({
        id: "ride-best-match",
        driverId: "driver-1",
        originAddress: "Campus Library",
        originLat: 58.9002,
        originLng: 5.7001,
        destinationAddress: "Central Station",
        destinationLat: 58.9701,
        destinationLng: 5.7301,
        departureTime,
        availableSeats: 3,
        totalSeats: 4,
        pricePerSeat: new Prisma.Decimal(85),
        detourFlexibilityKm: 5,
        preferences: ["quiet_ride", "no_smoking"],
        stops: [
          {
            id: "stop-best",
            address: "Student Union",
            lat: 58.905,
            lng: 5.705,
            orderIndex: 0,
          },
        ],
      }),
      makeRideRecord({
        id: "ride-cheap-but-off-route",
        driverId: "driver-2",
        originAddress: "Airport",
        originLat: 58.82,
        originLng: 5.59,
        destinationAddress: "Harbour",
        destinationLat: 58.84,
        destinationLng: 5.6,
        departureTime,
        availableSeats: 4,
        totalSeats: 4,
        pricePerSeat: new Prisma.Decimal(40),
        detourFlexibilityKm: 0.5,
        preferences: [],
      }),
      makeRideRecord({
        id: "ride-close-but-late",
        driverId: "driver-1",
        originAddress: "North Campus",
        originLat: 58.9005,
        originLng: 5.7004,
        destinationAddress: "Station Plaza",
        destinationLat: 58.9703,
        destinationLng: 5.7302,
        departureTime: new Date(departureTime.getTime() + 4 * 60 * 60 * 1000),
        availableSeats: 2,
        totalSeats: 3,
        pricePerSeat: new Prisma.Decimal(70),
        detourFlexibilityKm: 1,
        preferences: ["quiet_ride"],
      }),
    );

    const results = await searchRidesByLocation({
      pickupLat: 58.9001,
      pickupLng: 5.7002,
      dropoffLat: 58.9702,
      dropoffLng: 5.7302,
      seats: 2,
      preferences: ["quiet_ride", "no_smoking"],
      earliestDepartureTime: new Date(departureTime.getTime() - 15 * 60 * 1000).toISOString(),
      latestDepartureTime: new Date(departureTime.getTime() + 30 * 60 * 1000).toISOString(),
      sortBy: "bestMatch",
    });

    expect(results.map((ride) => ride.id)).toEqual([
      "ride-best-match",
      "ride-close-but-late",
      "ride-cheap-but-off-route",
    ]);
    expect(results[0]?.matchScore).toBeGreaterThan(results[1]?.matchScore ?? 0);
  });

  it("filters by minRating and sorts by rating", async () => {
    const departureTime = new Date(futureDate);
    testState.users.push({
      id: "driver-2",
      name: "Devon Driver",
      role: "DRIVER",
      driverProfileStatus: "APPROVED",
    });
    testState.rides.push(
      makeRideRecord({
        id: "ride-rated-low",
        driverId: "driver-1",
        originAddress: "A",
        destinationAddress: "B",
        departureTime,
        createdAt: departureTime,
        updatedAt: departureTime,
      }),
      makeRideRecord({
        id: "ride-rated-high",
        driverId: "driver-2",
        originAddress: "C",
        originLat: 58.91,
        originLng: 5.71,
        destinationAddress: "D",
        destinationLat: 58.98,
        destinationLng: 5.74,
        departureTime: new Date(departureTime.getTime() + 60_000),
        pricePerSeat: new Prisma.Decimal(90),
        createdAt: departureTime,
        updatedAt: departureTime,
      }),
    );
    testState.reviews.push(
      {
        id: "review-1",
        reviewerId: "passenger-1",
        revieweeId: "driver-1",
        rating: 3,
      },
      {
        id: "review-2",
        reviewerId: "passenger-1",
        revieweeId: "driver-2",
        rating: 5,
      },
    );

    const results = await searchRidesByLocation({
      minRating: 4,
      sortBy: "rating",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("ride-rated-high");
    expect(results[0]?.driverRating).toBe(5);
  });

  it("filters by price range and sorts by price", async () => {
    const departureTime = new Date(futureDate);
    testState.rides.push(
      makeRideRecord({
        id: "ride-cheap",
        driverId: "driver-1",
        originAddress: "A",
        destinationAddress: "B",
        departureTime,
        pricePerSeat: new Prisma.Decimal(50),
        createdAt: departureTime,
        updatedAt: departureTime,
      }),
      makeRideRecord({
        id: "ride-mid",
        driverId: "driver-1",
        originAddress: "C",
        originLat: 58.91,
        originLng: 5.71,
        destinationAddress: "D",
        destinationLat: 58.98,
        destinationLng: 5.74,
        departureTime: new Date(departureTime.getTime() + 60_000),
        createdAt: departureTime,
        updatedAt: departureTime,
      }),
      makeRideRecord({
        id: "ride-expensive",
        driverId: "driver-1",
        originAddress: "E",
        originLat: 58.92,
        originLng: 5.72,
        destinationAddress: "F",
        destinationLat: 58.99,
        destinationLng: 5.75,
        departureTime: new Date(departureTime.getTime() + 120_000),
        pricePerSeat: new Prisma.Decimal(120),
        createdAt: departureTime,
        updatedAt: departureTime,
      }),
    );

    const results = await searchRidesByLocation({
      minPrice: 60,
      maxPrice: 100,
      sortBy: "price",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("ride-mid");
    expect(results[0]?.pricePerSeat).toBe("80");
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

  it("accepts a zero price", () => {
    expect(
      CreateRideSchema.safeParse({ ...validRide, pricePerSeat: 0 }).success,
    ).toBe(true);
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

  it("accepts search filters for price, rating, and sorting", () => {
    expect(
      SearchRidesSchema.safeParse({
        minPrice: "50",
        maxPrice: "150",
        minRating: "4",
        sortBy: "bestMatch",
      }).success,
    ).toBe(true);
  });

  it("rejects minPrice above maxPrice", () => {
    expect(
      SearchRidesSchema.safeParse({
        minPrice: "150",
        maxPrice: "50",
      }).success,
    ).toBe(false);
  });
});

describe("CreateRideReviewSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts a valid review payload", () => {
    expect(
      CreateRideReviewSchema.safeParse({
        revieweeId: validUUID,
        rating: 5,
        comment: "Great rider",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid revieweeId", () => {
    expect(
      CreateRideReviewSchema.safeParse({
        revieweeId: "not-a-uuid",
        rating: 5,
      }).success,
    ).toBe(false);
  });

  it("rejects rating 0", () => {
    expect(
      CreateRideReviewSchema.safeParse({
        revieweeId: validUUID,
        rating: 0,
      }).success,
    ).toBe(false);
  });

  it("rejects rating 6", () => {
    expect(
      CreateRideReviewSchema.safeParse({
        revieweeId: validUUID,
        rating: 6,
      }).success,
    ).toBe(false);
  });

  it("accepts comment up to 1000 characters", () => {
    expect(
      CreateRideReviewSchema.safeParse({
        revieweeId: validUUID,
        rating: 4,
        comment: "x".repeat(1000),
      }).success,
    ).toBe(true);
  });

  it("rejects comment longer than 1000 characters", () => {
    expect(
      CreateRideReviewSchema.safeParse({
        revieweeId: validUUID,
        rating: 4,
        comment: "x".repeat(1001),
      }).success,
    ).toBe(false);
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
    testState.rides.push(
      makeRideRecord({
        id: "ride-mine-1",
        driverId: "driver-1",
        departureTime,
        availableSeats: 1,
        createdAt: departureTime,
        updatedAt: departureTime,
      }),
    );
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
    testState.bookings.push({
      id: "booking-1",
      rideId: createdRide.id,
      passengerId: "passenger-1",
      seatsBooked: 1,
      status: "CONFIRMED",
      createdAt: new Date(),
    });

    const startResponse = await runHandlers(
      [requireAuth, requireRole("DRIVER"), startRide],
      {
        method: "PATCH",
        headers: { authorization: "Bearer driver-token" },
        params: { id: createdRide.id },
        body: { startedAt: new Date().toISOString() },
      },
    );

    expect(startResponse.statusCode).toBe(200);
    expect((startResponse.body.data as RideRecord).status).toBe("IN_PROGRESS");
    expect(queueRideStartedMock).toHaveBeenCalledWith(createdRide.id);
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
    expect(testState.bookings[0]?.status).toBe("COMPLETED");
    expect(notifyRideStatusMock).toHaveBeenLastCalledWith(createdRide.id, {
      rideId: createdRide.id,
      bookingId: "",
      status: "finished",
    });
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
      driverProfileStatus: "APPROVED",
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

  it("allows the ride driver to cancel a scheduled ride with no confirmed bookings", async () => {
    const departureTime = new Date(futureDate);
    testState.rides.push(
      makeRideRecord({
        id: "ride-cancel-open",
        driverId: "driver-1",
        departureTime,
        createdAt: departureTime,
        updatedAt: departureTime,
      }),
    );
    testState.bookings.push({
      id: "booking-pending-1",
      rideId: "ride-cancel-open",
      passengerId: "passenger-1",
      seatsBooked: 1,
      status: "PENDING",
      createdAt: departureTime,
    });

    const response = await runHandlers(
      [requireAuth, requireRole("DRIVER"), cancelRide],
      {
        method: "DELETE",
        headers: { authorization: "Bearer driver-token" },
        params: { id: "ride-cancel-open" },
      },
    );

    expect(response.statusCode).toBe(200);
    expect((response.body.data as RideRecord).status).toBe("CANCELLED");
    expect(
      testState.bookings.find((booking) => booking.id === "booking-pending-1")
        ?.status,
    ).toBe("CANCELLED");
    expect(
      testState.rides.find((ride) => ride.id === "ride-cancel-open")
        ?.availableSeats,
    ).toBe(3);
    expect(response.body.meta).toMatchObject({
      cancellationStrikeApplied: false,
      affectedPassengers: 1,
    });
    expect(
      testState.users.find((user) => user.id === "driver-1")
        ?.cancellationStrikes,
    ).toBe(0);
    expect(notifyBookingStatusMock).toHaveBeenCalledWith("passenger-1", {
      bookingId: "booking-pending-1",
      status: "cancelled",
      updatedAt: expect.any(String),
    });
    expect(notifyRideStatusMock).toHaveBeenCalledWith("ride-cancel-open", {
      rideId: "ride-cancel-open",
      bookingId: "",
      status: "cancelled",
    });
  });

  it("cancels confirmed bookings, restores seats, and notifies the ride room", async () => {
    const departureTime = new Date(futureDate);
    testState.users.push({
      id: "passenger-2",
      name: "Parker Passenger",
      role: "PASSENGER",
    });
    testState.rides.push(
      makeRideRecord({
        id: "ride-cancel-confirmed",
        driverId: "driver-1",
        departureTime,
        totalSeats: 4,
        availableSeats: 1,
        status: "FULL",
        createdAt: departureTime,
        updatedAt: departureTime,
      }),
    );
    testState.bookings.push(
      {
        id: "booking-confirmed-1",
        rideId: "ride-cancel-confirmed",
        passengerId: "passenger-1",
        seatsBooked: 2,
        status: "CONFIRMED",
        createdAt: departureTime,
      },
      {
        id: "booking-confirmed-2",
        rideId: "ride-cancel-confirmed",
        passengerId: "passenger-2",
        seatsBooked: 1,
        status: "CONFIRMED",
        createdAt: departureTime,
      },
    );

    const response = await runHandlers(
      [requireAuth, requireRole("DRIVER"), cancelRide],
      {
        method: "DELETE",
        headers: { authorization: "Bearer driver-token" },
        params: { id: "ride-cancel-confirmed" },
      },
    );

    expect(response.statusCode).toBe(200);
    expect((response.body.data as RideRecord).status).toBe("CANCELLED");
    expect(
      testState.bookings
        .filter((booking) => booking.rideId === "ride-cancel-confirmed")
        .every((booking) => booking.status === "CANCELLED"),
    ).toBe(true);
    expect(
      testState.rides.find((ride) => ride.id === "ride-cancel-confirmed")
        ?.availableSeats,
    ).toBe(4);
    expect(response.body.meta).toMatchObject({
      cancellationStrikeApplied: true,
      affectedPassengers: 2,
    });
    expect(
      testState.users.find((user) => user.id === "driver-1")
        ?.cancellationStrikes,
    ).toBe(1);
    expect(notifyBookingStatusMock).toHaveBeenCalledTimes(2);
    expect(notifyRideStatusMock).toHaveBeenCalledWith(
      "ride-cancel-confirmed",
      {
        rideId: "ride-cancel-confirmed",
        bookingId: "",
        status: "cancelled",
      },
    );
  });

  it("rejects ride cancellation from another driver", async () => {
    const departureTime = new Date(futureDate);
    testState.users.push({
      id: "driver-2",
      name: "Devon Driver",
      role: "DRIVER",
      driverProfileStatus: "APPROVED",
    });
    testState.rides.push(
      makeRideRecord({
        id: "ride-cancel-forbidden",
        driverId: "driver-1",
        departureTime,
        createdAt: departureTime,
        updatedAt: departureTime,
      }),
    );

    const response = await runHandlers(
      [requireAuth, requireRole("DRIVER"), cancelRide],
      {
        method: "DELETE",
        headers: { authorization: "Bearer driver-2-token" },
        params: { id: "ride-cancel-forbidden" },
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

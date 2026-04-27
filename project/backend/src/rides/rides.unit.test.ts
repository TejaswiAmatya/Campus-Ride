import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import {
  CreateRideReviewSchema,
  CreateRideSchema,
  SearchRidesSchema,
  UpdateRideStatusSchema,
} from "./schemas";
import { searchRidesByLocation } from "./location";
import { prisma } from "../lib/prisma";

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

type SearchRideRecord = {
  id: string;
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
  status: "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
  driver: {
    id: string;
    name: string;
    avatarPath: string | null;
    driverProfile: { vehicleInfo: Prisma.JsonValue } | null;
    reviewsReceived: Array<{ rating: number }>;
  } | null;
  stops: Array<{
    id: string;
    address: string;
    lat: number;
    lng: number;
    orderIndex: number;
  }>;
};

type SearchWhere = {
  status?: string;
  availableSeats?: { gte: number };
  pricePerSeat?: { gte?: number; lte?: number };
  departureTime?: { gte?: Date; lt?: Date; lte?: Date };
  originAddress?: { contains: string; mode: "insensitive" };
  destinationAddress?: { contains: string; mode: "insensitive" };
};

const searchState: { rides: SearchRideRecord[] } = {
  rides: [],
};

function includesInsensitive(value: string, needle: string) {
  return value.toLowerCase().includes(needle.toLowerCase());
}

function matchesWhere(ride: SearchRideRecord, where: SearchWhere) {
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

  if (
    where.originAddress &&
    !includesInsensitive(ride.originAddress, where.originAddress.contains)
  ) {
    return false;
  }

  if (
    where.destinationAddress &&
    !includesInsensitive(
      ride.destinationAddress,
      where.destinationAddress.contains,
    )
  ) {
    return false;
  }

  return true;
}

function makeRideRecord(
  overrides: Partial<SearchRideRecord> & Pick<SearchRideRecord, "id">,
): SearchRideRecord {
  const departureTime = overrides.departureTime ?? new Date(futureDate);

  return {
    id: overrides.id,
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
    status: overrides.status ?? "OPEN",
    createdAt: overrides.createdAt ?? departureTime,
    updatedAt: overrides.updatedAt ?? departureTime,
    driver: overrides.driver ?? {
      id: "driver-1",
      name: "Dana Driver",
      avatarPath: null,
      driverProfile: { vehicleInfo: null },
      reviewsReceived: [],
    },
    stops: overrides.stops ?? [],
  };
}

vi.mock("../lib/prisma", () => ({
  prisma: {
    ride: {
      findMany: vi.fn(async ({ where }: { where: SearchWhere }) =>
        searchState.rides
          .filter((ride) => matchesWhere(ride, where))
          .sort(
            (left, right) =>
              left.departureTime.getTime() - right.departureTime.getTime(),
          )
          .map((ride) => ({
            ...ride,
            driver: ride.driver,
            stops: ride.stops,
          })),
      ),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  searchState.rides = [];
});

describe("searchRidesByLocation", () => {
  it("ranks rides by route fit, stops, timing, and preferences", async () => {
    const departureTime = new Date(futureDate);

    searchState.rides.push(
      makeRideRecord({
        id: "ride-best-match",
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
        driver: {
          id: "driver-1",
          name: "Dana Driver",
          avatarPath: null,
          driverProfile: { vehicleInfo: null },
          reviewsReceived: [{ rating: 5 }, { rating: 4 }],
        },
      }),
      makeRideRecord({
        id: "ride-cheap-but-off-route",
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
        driver: {
          id: "driver-2",
          name: "Devon Driver",
          avatarPath: null,
          driverProfile: { vehicleInfo: null },
          reviewsReceived: [{ rating: 5 }],
        },
      }),
      makeRideRecord({
        id: "ride-close-but-late",
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
      earliestDepartureTime: new Date(
        departureTime.getTime() - 15 * 60 * 1000,
      ).toISOString(),
      latestDepartureTime: new Date(
        departureTime.getTime() + 30 * 60 * 1000,
      ).toISOString(),
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

    searchState.rides.push(
      makeRideRecord({
        id: "ride-rated-low",
        originAddress: "A",
        destinationAddress: "B",
        departureTime,
        driver: {
          id: "driver-1",
          name: "Dana Driver",
          avatarPath: null,
          driverProfile: { vehicleInfo: null },
          reviewsReceived: [{ rating: 3 }],
        },
      }),
      makeRideRecord({
        id: "ride-rated-high",
        originAddress: "C",
        originLat: 58.91,
        originLng: 5.71,
        destinationAddress: "D",
        destinationLat: 58.98,
        destinationLng: 5.74,
        departureTime: new Date(departureTime.getTime() + 60_000),
        pricePerSeat: new Prisma.Decimal(90),
        driver: {
          id: "driver-2",
          name: "Devon Driver",
          avatarPath: null,
          driverProfile: { vehicleInfo: null },
          reviewsReceived: [{ rating: 5 }],
        },
      }),
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

    searchState.rides.push(
      makeRideRecord({
        id: "ride-cheap",
        originAddress: "A",
        destinationAddress: "B",
        departureTime,
        pricePerSeat: new Prisma.Decimal(50),
      }),
      makeRideRecord({
        id: "ride-mid",
        originAddress: "C",
        originLat: 58.91,
        originLng: 5.71,
        destinationAddress: "D",
        destinationLat: 58.98,
        destinationLng: 5.74,
        departureTime: new Date(departureTime.getTime() + 60_000),
      }),
      makeRideRecord({
        id: "ride-expensive",
        originAddress: "E",
        originLat: 58.92,
        originLng: 5.72,
        destinationAddress: "F",
        destinationLat: 58.99,
        destinationLng: 5.75,
        departureTime: new Date(departureTime.getTime() + 120_000),
        pricePerSeat: new Prisma.Decimal(120),
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

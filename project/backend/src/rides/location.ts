import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { SearchRidesInput } from "./schemas";
import { serializeRideList } from "./serialize";

// Backend helpers for ride search proximity queries.
const DEFAULT_RADIUS_KM = 5;
const KM_PER_LATITUDE_DEGREE = 110.574;
const KM_PER_LONGITUDE_DEGREE_AT_EQUATOR = 111.32;

type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

type ProximityFilter = {
  whereClause: Prisma.Sql;
  distanceExpression: Prisma.Sql;
};

type ProximityRideRow = {
  id: string;
  sortDistanceMeters: number;
};

type SearchRideRow = any;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function buildBoundingBox(
  lat: number,
  lng: number,
  radiusKm: number,
): BoundingBox {
  const latitudeDelta = radiusKm / KM_PER_LATITUDE_DEGREE;
  const longitudeScale = Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  const longitudeDelta =
    radiusKm / (KM_PER_LONGITUDE_DEGREE_AT_EQUATOR * longitudeScale);

  return {
    minLat: clamp(lat - latitudeDelta, -90, 90),
    maxLat: clamp(lat + latitudeDelta, -90, 90),
    minLng: clamp(lng - longitudeDelta, -180, 180),
    maxLng: clamp(lng + longitudeDelta, -180, 180),
  };
}

function buildProximityFilter(
  latColumn: "originLat" | "destinationLat",
  lngColumn: "originLng" | "destinationLng",
  lat: number,
  lng: number,
  radiusKm: number,
): ProximityFilter {
  const box = buildBoundingBox(lat, lng, radiusKm);
  const radiusMeters = radiusKm * 1000;
  const latitudeField =
    latColumn === "originLat"
      ? Prisma.sql`r."originLat"`
      : Prisma.sql`r."destinationLat"`;
  const longitudeField =
    lngColumn === "originLng"
      ? Prisma.sql`r."originLng"`
      : Prisma.sql`r."destinationLng"`;
  const ridePoint = Prisma.sql`ST_SetSRID(ST_MakePoint(${longitudeField}, ${latitudeField}), 4326)::geography`;
  const searchPoint = Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

  return {
    whereClause: Prisma.sql`
      ${latitudeField} BETWEEN ${box.minLat} AND ${box.maxLat}
      AND ${longitudeField} BETWEEN ${box.minLng} AND ${box.maxLng}
      AND ST_DWithin(${ridePoint}, ${searchPoint}, ${radiusMeters})
    `,
    distanceExpression: Prisma.sql`ST_Distance(${ridePoint}, ${searchPoint})`,
  };
}

function getDateBounds(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);

  return {
    start,
    end: new Date(start.getTime() + ONE_DAY_MS),
  };
}

function getAverageRating(ride: SearchRideRow) {
  const ratings =
    ride.driver?.reviewsReceived?.map((review: { rating: number }) => review.rating) ?? [];

  if (ratings.length === 0) {
    return null;
  }

  const total = ratings.reduce((sum: number, rating: number) => sum + rating, 0);
  return Number((total / ratings.length).toFixed(2));
}

function sortSearchRides(
  rides: SearchRideRow[],
  sortBy: SearchRidesInput["sortBy"],
) {
  return [...rides].sort((left, right) => {
    if (sortBy === "price") {
      const priceDiff =
        Number(left.pricePerSeat) - Number(right.pricePerSeat);
      if (priceDiff !== 0) {
        return priceDiff;
      }
    }

    if (sortBy === "rating") {
      const leftRating = getAverageRating(left) ?? -1;
      const rightRating = getAverageRating(right) ?? -1;
      if (rightRating !== leftRating) {
        return rightRating - leftRating;
      }
    }

    return left.departureTime.getTime() - right.departureTime.getTime();
  });
}

function serializeSearchRide(ride: SearchRideRow) {
  return {
    ...serializeRideList(ride),
    driverRating: getAverageRating(ride),
  };
}

export async function searchRidesByLocation(query: SearchRidesInput) {
  const seats = query.seats ?? 1;
  const dateBounds = query.date ? getDateBounds(query.date) : null;
  const originText = query.pickup ?? query.origin ?? query.location;
  const destinationText = query.dropoff ?? query.dest;
  const effectiveOriginLat = query.pickupLat ?? query.originLat;
  const effectiveOriginLng = query.pickupLng ?? query.originLng;
  const effectiveDestLat = query.dropoffLat ?? query.destLat;
  const effectiveDestLng = query.dropoffLng ?? query.destLng;
  const textFilters = {
    ...(originText && {
      originAddress: {
        contains: originText,
        mode: "insensitive" as const,
      },
    }),
    ...(destinationText && {
      destinationAddress: {
        contains: destinationText,
        mode: "insensitive" as const,
      },
    }),
  };
  const priceFilters = {
    ...(query.minPrice !== undefined && {
      gte: query.minPrice,
    }),
    ...(query.maxPrice !== undefined && {
      lte: query.maxPrice,
    }),
  };
  const departureWindowFilter = {
    ...(query.earliestDepartureTime && {
      gte: new Date(query.earliestDepartureTime),
    }),
    ...(query.latestDepartureTime && {
      lte: new Date(query.latestDepartureTime),
    }),
  };
  const departureTimeFilter = {
    ...(dateBounds && {
      gte: dateBounds.start,
      lt: dateBounds.end,
    }),
    ...departureWindowFilter,
  };

  if (effectiveOriginLat === undefined && effectiveDestLat === undefined) {
    const rides = await prisma.ride.findMany({
      where: {
        status: "OPEN",
        availableSeats: { gte: seats },
        ...(Object.keys(priceFilters).length > 0 && {
          pricePerSeat: priceFilters,
        }),
        ...(query.preferences?.length && {
          preferences: { hasEvery: query.preferences },
        }),
        ...textFilters,
        ...(Object.keys(departureTimeFilter).length > 0 && {
          departureTime: departureTimeFilter,
        }),
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatarPath: true,
            driverProfile: { select: { vehicleInfo: true } },
            reviewsReceived: { select: { rating: true } },
          },
        },
      },
    });

    return sortSearchRides(
      rides.filter((ride) => {
        const rating = getAverageRating(ride);
        return query.minRating === undefined || (rating ?? 0) >= query.minRating;
      }),
      query.sortBy,
    ).map(serializeSearchRide);
  }

  const radiusKm = query.radiusKm ?? DEFAULT_RADIUS_KM;
  const originFilter =
    effectiveOriginLat !== undefined && effectiveOriginLng !== undefined
      ? buildProximityFilter(
          "originLat",
          "originLng",
          effectiveOriginLat,
          effectiveOriginLng,
          radiusKm,
        )
      : null;
  const destinationFilter =
    effectiveDestLat !== undefined && effectiveDestLng !== undefined
      ? buildProximityFilter(
          "destinationLat",
          "destinationLng",
          effectiveDestLat,
          effectiveDestLng,
          radiusKm,
        )
      : null;

  const dateFilter = dateBounds
    ? Prisma.sql`AND r."departureTime" >= ${dateBounds.start} AND r."departureTime" < ${dateBounds.end}`
    : Prisma.empty;
  const departureWindowSql = Prisma.sql`
    ${query.earliestDepartureTime ? Prisma.sql`AND r."departureTime" >= ${new Date(query.earliestDepartureTime)}` : Prisma.empty}
    ${query.latestDepartureTime ? Prisma.sql`AND r."departureTime" <= ${new Date(query.latestDepartureTime)}` : Prisma.empty}
  `;
  const priceFilter =
    query.minPrice !== undefined || query.maxPrice !== undefined
      ? Prisma.sql`AND r."pricePerSeat" BETWEEN ${query.minPrice ?? 0} AND ${query.maxPrice ?? 999999999}`
      : Prisma.empty;

  const sortDistance =
    originFilter && destinationFilter
      ? Prisma.sql`${originFilter.distanceExpression} + ${destinationFilter.distanceExpression}`
      : originFilter
        ? originFilter.distanceExpression
        : destinationFilter!.distanceExpression;

  const proximityRows = await prisma.$queryRaw<ProximityRideRow[]>(Prisma.sql`
    SELECT
      r."id",
      ${sortDistance} AS "sortDistanceMeters"
    FROM "Ride" r
    WHERE r."status" = 'OPEN'
      AND r."availableSeats" >= ${seats}
      ${dateFilter}
      ${departureWindowSql}
      ${priceFilter}
      ${originFilter ? Prisma.sql`AND ${originFilter.whereClause}` : Prisma.empty}
      ${destinationFilter ? Prisma.sql`AND ${destinationFilter.whereClause}` : Prisma.empty}
    ORDER BY "sortDistanceMeters" ASC, r."departureTime" ASC
  `);

  if (proximityRows.length === 0) {
    return [];
  }

  const rides = await prisma.ride.findMany({
    where: {
      id: { in: proximityRows.map((row) => row.id) },
      status: "OPEN",
      availableSeats: { gte: seats },
      ...(Object.keys(priceFilters).length > 0 && {
        pricePerSeat: priceFilters,
      }),
      ...(query.preferences?.length && {
        preferences: { hasEvery: query.preferences },
      }),
      ...textFilters,
      ...(Object.keys(departureTimeFilter).length > 0 && {
        departureTime: departureTimeFilter,
      }),
    },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          avatarPath: true,
          driverProfile: { select: { vehicleInfo: true } },
          reviewsReceived: { select: { rating: true } },
        },
      },
    },
  });
  const rideById = new Map(rides.map((ride) => [ride.id, ride]));
  const orderedRides = proximityRows
    .map((row) => rideById.get(row.id))
    .filter((ride): ride is NonNullable<typeof ride> => Boolean(ride));

  return sortSearchRides(
    orderedRides.filter((ride) => {
      const rating = getAverageRating(ride);
      return query.minRating === undefined || (rating ?? 0) >= query.minRating;
    }),
    query.sortBy,
  ).map(serializeSearchRide);
}

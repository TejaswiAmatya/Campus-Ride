import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { SearchRidesInput } from "./schemas";

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

export async function searchRidesByLocation(query: SearchRidesInput) {
  const seats = query.seats ?? 1;
  const dateBounds = query.date ? getDateBounds(query.date) : null;
  const originText = query.origin ?? query.location;
  const destinationText = query.dest;
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

  if (query.originLat === undefined && query.destLat === undefined) {
    return prisma.ride.findMany({
      where: {
        status: "OPEN",
        availableSeats: { gte: seats },
        ...textFilters,
        ...(dateBounds && {
          departureTime: {
            gte: dateBounds.start,
            lt: dateBounds.end,
          },
        }),
      },
      include: {
        driver: { select: { id: true, name: true, avatarPath: true } },
      },
      orderBy: { departureTime: "asc" },
    });
  }

  const radiusKm = query.radiusKm ?? DEFAULT_RADIUS_KM;
  const originFilter =
    query.originLat !== undefined && query.originLng !== undefined
      ? buildProximityFilter(
          "originLat",
          "originLng",
          query.originLat,
          query.originLng,
          radiusKm,
        )
      : null;
  const destinationFilter =
    query.destLat !== undefined && query.destLng !== undefined
      ? buildProximityFilter(
          "destinationLat",
          "destinationLng",
          query.destLat,
          query.destLng,
          radiusKm,
        )
      : null;

  const dateFilter = dateBounds
    ? Prisma.sql`AND r."departureTime" >= ${dateBounds.start} AND r."departureTime" < ${dateBounds.end}`
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
      ...textFilters,
      ...(dateBounds && {
        departureTime: {
          gte: dateBounds.start,
          lt: dateBounds.end,
        },
      }),
    },
    include: { driver: { select: { id: true, name: true, avatarPath: true } } },
  });
  const rideById = new Map(rides.map((ride) => [ride.id, ride]));

  return proximityRows
    .map((row) => rideById.get(row.id))
    .filter((ride): ride is NonNullable<typeof ride> => Boolean(ride));
}

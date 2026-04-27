import { prisma } from "../lib/prisma";
import type { SearchRidesInput } from "./schemas";
import { serializeRideList } from "./serialize";
import { rankSearchRides } from "./matching";

type SearchRideRow = any;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getDateBounds(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);

  return {
    start,
    end: new Date(start.getTime() + ONE_DAY_MS),
  };
}

function buildDepartureTimeFilter(date?: string) {
  const now = new Date();

  if (!date) {
    return { gte: now };
  }

  const { start, end } = getDateBounds(date);
  return {
    gte: start > now ? start : now,
    lt: end,
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

function serializeSearchRide(ride: SearchRideRow) {
  return {
    ...serializeRideList(ride),
    driverRating: getAverageRating(ride),
    matchScore: typeof ride.matchScore === "number" ? ride.matchScore : undefined,
  };
}

export async function searchRidesByLocation(query: SearchRidesInput) {
  const seats = query.seats ?? 1;
  const originText = query.pickup ?? query.origin ?? query.location;
  const destinationText = query.dropoff ?? query.dest;
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
  const departureTimeFilter = buildDepartureTimeFilter(query.date);

  const rides = await prisma.ride.findMany({
    where: {
      status: "OPEN",
      availableSeats: { gte: seats },
      ...(Object.keys(priceFilters).length > 0 && {
        pricePerSeat: priceFilters,
      }),
      ...textFilters,
      departureTime: departureTimeFilter,
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
      stops: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  const filtered = rides.filter((ride) => {
    const rating = getAverageRating(ride);
    return query.minRating === undefined || (rating ?? 0) >= query.minRating;
  });

  const ranked = rankSearchRides(
    filtered.map((ride) => ({
      ...ride,
      driverRating: getAverageRating(ride),
      stops: ride.stops ?? [],
    })),
    query,
  );

  return ranked.map(serializeSearchRide);
}

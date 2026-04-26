import type { SearchRidesInput } from "./schemas";

type RoutePoint = {
  lat: number;
  lng: number;
};

type SearchRideCandidate = {
  id: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  departureTime: Date;
  availableSeats: number;
  totalSeats: number;
  pricePerSeat: string | number | { toString(): string };
  detourFlexibilityKm?: number | null;
  preferences?: string[];
  stops?: Array<{ lat: number; lng: number }>;
  driverRating?: number | null;
};

export type RideMatchBreakdown = {
  pickup: number;
  dropoff: number;
  stops: number;
  detour: number;
  departure: number;
  seats: number;
  price: number;
  preferences: number;
  total: number;
};

export type RankedRide<T extends SearchRideCandidate> = T & {
  matchScore: number;
  matchBreakdown: RideMatchBreakdown;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function haversineKm(left: RoutePoint, right: RoutePoint) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(right.lat - left.lat);
  const dLng = toRadians(right.lng - left.lng);
  const lat1 = toRadians(left.lat);
  const lat2 = toRadians(right.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeDistanceScore(distanceKm: number, targetKm: number) {
  if (targetKm <= 0) {
    return distanceKm === 0 ? 1 : 0;
  }

  return clamp(1 - distanceKm / targetKm, 0, 1);
}

function getRoutePoints(ride: SearchRideCandidate) {
  return [
    { lat: ride.originLat, lng: ride.originLng },
    ...((ride.stops ?? []).map((stop) => ({ lat: stop.lat, lng: stop.lng })) ?? []),
    { lat: ride.destinationLat, lng: ride.destinationLng },
  ];
}

function getClosestDistanceKm(target: RoutePoint, points: RoutePoint[]) {
  return points.reduce((best, point) => Math.min(best, haversineKm(target, point)), Number.POSITIVE_INFINITY);
}

function scoreDepartureWindow(ride: SearchRideCandidate, query: SearchRidesInput) {
  if (!query.earliestDepartureTime && !query.latestDepartureTime) {
    return 1;
  }

  const departureMs = ride.departureTime.getTime();
  const startMs = query.earliestDepartureTime
    ? new Date(query.earliestDepartureTime).getTime()
    : departureMs;
  const endMs = query.latestDepartureTime
    ? new Date(query.latestDepartureTime).getTime()
    : departureMs;

  if (departureMs < startMs) {
    return clamp(1 - (startMs - departureMs) / (3 * 60 * 60 * 1000), 0, 1);
  }

  if (departureMs > endMs) {
    return clamp(1 - (departureMs - endMs) / (3 * 60 * 60 * 1000), 0, 1);
  }

  if (startMs === endMs) {
    return 1;
  }

  const midpoint = startMs + (endMs - startMs) / 2;
  const distanceFromMidpoint = Math.abs(departureMs - midpoint);
  return clamp(1 - distanceFromMidpoint / ((endMs - startMs) / 2 || 1), 0.5, 1);
}

function scorePreferenceMatch(ride: SearchRideCandidate, requestedPreferences?: string[]) {
  if (!requestedPreferences || requestedPreferences.length === 0) {
    return 1;
  }

  const ridePreferences = new Set(ride.preferences ?? []);
  const matched = requestedPreferences.filter((preference) => ridePreferences.has(preference)).length;
  return matched / requestedPreferences.length;
}

export function scoreRideMatch(
  ride: SearchRideCandidate,
  query: SearchRidesInput,
  context: {
    minPrice: number;
    maxPrice: number;
  },
): RideMatchBreakdown {
  const routePoints = getRoutePoints(ride);
  const stopPoints = (ride.stops ?? []).map((stop) => ({ lat: stop.lat, lng: stop.lng }));
  const radiusKm = query.radiusKm ?? 5;
  const detourKm = Math.max(ride.detourFlexibilityKm ?? 0, 0);
  const price = Number(ride.pricePerSeat);
  const requestedSeats = query.seats ?? 1;

  const pickupTarget =
    query.pickupLat !== undefined && query.pickupLng !== undefined
      ? { lat: query.pickupLat, lng: query.pickupLng }
      : query.originLat !== undefined && query.originLng !== undefined
        ? { lat: query.originLat, lng: query.originLng }
        : null;
  const dropoffTarget =
    query.dropoffLat !== undefined && query.dropoffLng !== undefined
      ? { lat: query.dropoffLat, lng: query.dropoffLng }
      : query.destLat !== undefined && query.destLng !== undefined
        ? { lat: query.destLat, lng: query.destLng }
        : null;

  const pickupDistance = pickupTarget
    ? getClosestDistanceKm(pickupTarget, routePoints)
    : 0;
  const dropoffDistance = dropoffTarget
    ? getClosestDistanceKm(dropoffTarget, routePoints)
    : 0;

  const pickup = pickupTarget
    ? normalizeDistanceScore(pickupDistance, radiusKm + detourKm + 0.5)
    : 1;
  const dropoff = dropoffTarget
    ? normalizeDistanceScore(dropoffDistance, radiusKm + detourKm + 0.5)
    : 1;

  const pickupStopDistance =
    pickupTarget && stopPoints.length > 0
      ? getClosestDistanceKm(pickupTarget, stopPoints)
      : Number.POSITIVE_INFINITY;
  const dropoffStopDistance =
    dropoffTarget && stopPoints.length > 0
      ? getClosestDistanceKm(dropoffTarget, stopPoints)
      : Number.POSITIVE_INFINITY;
  const stops =
    stopPoints.length === 0
      ? 0
      : Math.max(
          pickupTarget ? normalizeDistanceScore(pickupStopDistance, Math.max(radiusKm, 1.5)) : 0,
          dropoffTarget ? normalizeDistanceScore(dropoffStopDistance, Math.max(radiusKm, 1.5)) : 0,
        );

  const detourTarget = Math.max(pickupDistance, dropoffDistance);
  const detour =
    pickupTarget || dropoffTarget
      ? normalizeDistanceScore(detourTarget, Math.max(detourKm + radiusKm, radiusKm))
      : 1;

  const departure = scoreDepartureWindow(ride, query);
  const seats = clamp((ride.availableSeats - requestedSeats + 1) / Math.max(ride.totalSeats, 1), 0, 1);
  const priceRange = Math.max(context.maxPrice - context.minPrice, 1);
  const normalizedPrice = clamp((context.maxPrice - price) / priceRange, 0, 1);
  const preferences = scorePreferenceMatch(ride, query.preferences);

  const total =
    pickup * 0.24 +
    dropoff * 0.22 +
    stops * 0.12 +
    detour * 0.1 +
    departure * 0.12 +
    seats * 0.08 +
    normalizedPrice * 0.07 +
    preferences * 0.05;

  return {
    pickup,
    dropoff,
    stops,
    detour,
    departure,
    seats,
    price: normalizedPrice,
    preferences,
    total,
  };
}

export function rankSearchRides<T extends SearchRideCandidate>(
  rides: T[],
  query: SearchRidesInput,
): RankedRide<T>[] {
  if (rides.length === 0) {
    return [];
  }

  const prices = rides.map((ride) => Number(ride.pricePerSeat));
  const context = {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };

  const ranked = rides.map((ride) => {
    const matchBreakdown = scoreRideMatch(ride, query, context);
    return {
      ...ride,
      matchScore: Number((matchBreakdown.total * 100).toFixed(1)),
      matchBreakdown,
    };
  });

  return ranked.sort((left, right) => {
    if (query.sortBy === "price") {
      const priceDiff = Number(left.pricePerSeat) - Number(right.pricePerSeat);
      if (priceDiff !== 0) return priceDiff;
    }

    if (query.sortBy === "rating") {
      const leftRating = left.driverRating ?? -1;
      const rightRating = right.driverRating ?? -1;
      if (rightRating !== leftRating) return rightRating - leftRating;
    }

    if (query.sortBy === "departureTime") {
      const departureDiff = left.departureTime.getTime() - right.departureTime.getTime();
      if (departureDiff !== 0) return departureDiff;
    }

    if (right.matchBreakdown.total !== left.matchBreakdown.total) {
      return right.matchBreakdown.total - left.matchBreakdown.total;
    }

    return left.departureTime.getTime() - right.departureTime.getTime();
  });
}

export interface RideLocationInput {
  address: string;
  lat: number;
  lng: number;
}

export interface RideStopInput {
  id?: string;
  address: string;
  lat: number;
  lng: number;
  orderIndex?: number;
}

export type RideOfferType = "ONE_TIME" | "RECURRING";
export type RideRecurrencePattern = "NONE" | "DAILY" | "WEEKLY" | "SPECIFIC_DAYS";

export interface CreateRideDto {
  offerType: RideOfferType;
  origin: RideLocationInput;
  destination: RideLocationInput;
  stops?: RideStopInput[];
  departureTime: string;
  totalSeats: number;
  pricePerSeat: number;
  detourFlexibilityKm?: number;
  preferences?: string[];
  recurrencePattern?: RideRecurrencePattern;
  recurrenceDays?: number[];
  recurrenceEndDate?: string | null;
  routePolyline?: string | null;
  routeDistanceKm?: number | null;
  routeDurationMinutes?: number | null;
}

export interface UpdateRideDto {
  origin?: RideLocationInput;
  destination?: RideLocationInput;
  stops?: RideStopInput[];
  departureTime?: string;
  totalSeats?: number;
  pricePerSeat?: number;
  detourFlexibilityKm?: number;
  preferences?: string[];
  routePolyline?: string | null;
  routeDistanceKm?: number | null;
  routeDurationMinutes?: number | null;
  updateMessage?: string;
}

export interface RideDriver {
  id: string;
  name: string;
  avatarUrl?: string | null;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    colour: string;
    plateNumber: string;
  } | null;
}

export interface RideParticipant {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface RideBooking {
  id: string;
  seatsBooked: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  totalFare: string;
  driverEarnings: string;
  passenger: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  review: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
}

export interface Ride {
  participants?: RideParticipant[];
  id: string;
  rideSeriesId?: string | null;
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  departureTime: string;
  availableSeats: number;
  totalSeats: number;
  pricePerSeat: string;
  detourFlexibilityKm?: number;
  preferences?: string[];
  routePolyline?: string | null;
  routeDistanceKm?: number | null;
  routeDurationMinutes?: number | null;
  recurrencePattern?: RideRecurrencePattern;
  recurrenceDays?: number[];
  recurrenceInstanceAt?: string | null;
  offerType?: RideOfferType;
  stops?: RideStopInput[];
  status: "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  driverRating?: number | null;
  driver: RideDriver;
  bookings?: RideBooking[];
  _count?: {
    bookings: number;
  };
  stats?: {
    totalPassengers: number;
    completedPassengers: number;
    totalEarnings: string;
    completedEarnings: string;
    pendingRequests: number;
    completedBookings: number;
  };
}

export interface SearchRidesParams {
  location?: string;
  origin?: string;
  dest?: string;
  date?: string;
  seats?: number;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: "departureTime" | "price" | "rating";
}

export type RideStatusUpdate = "ACTIVE" | "COMPLETED" | "CANCELLED";

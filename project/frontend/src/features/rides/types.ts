export interface RideLocationInput {
  address: string;
  lat: number;
  lng: number;
}

export interface CreateRideDto {
  origin: RideLocationInput;
  destination: RideLocationInput;
  departureTime: string;
  totalSeats: number;
  pricePerSeat: number;
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
  passenger: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface Ride {
  participants?: RideParticipant[];
  id: string;
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
  status: "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  driver: RideDriver;
  bookings?: RideBooking[];
  _count?: {
    bookings: number;
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
}

export type RideStatusUpdate = "ACTIVE" | "COMPLETED" | "CANCELLED";

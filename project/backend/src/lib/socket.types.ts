// Data sent when a new booking is created
export interface BookingNewPayload {
  bookingId: string;
  passengerId: string;
  passengerName?: string; // optional, can be filled in later for richer notifications
  pickupLocation: { lat: number; lng: number };
  dropoffLocation: { lat: number; lng: number };
  requestedAt: string; // ISO timestamp
}

// Data sent when a booking's status changes
export interface BookingStatusPayload {
  bookingId: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  updatedAt: string;
}

// Data sent when a ride's real-time status changes
export interface RideStatusPayload {
  rideId: string;
  bookingId: string;
  driverLocation?: { lat: number; lng: number };
  status:
    | "driver_assigned"
    | "en_route"
    | "arrived"
    | "in_progress"
    | "finished";
  estimatedArrivalMinutes?: number;
}

export interface DriverLocationUpdatePayload {
  rideId: string;
  lat: number;
  lng: number;
}

export interface DriverLocationPayload {
  lat: number;
  lng: number;
  updatedAt: string;
}

// Data sent when a new booking is created
export interface BookingNewPayload {
  bookingId: string;
  userId: string;
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

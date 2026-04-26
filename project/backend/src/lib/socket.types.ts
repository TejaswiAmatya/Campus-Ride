// Data sent when a new booking is created
export interface BookingNewPayload {
  bookingId: string;
  passengerId: string;
  rideId: string;
  passengerName?: string; // optional, can be filled in later for richer notifications
  pickupLocation?: { lat: number; lng: number };
  dropoffLocation?: { lat: number; lng: number };
  requestedAt?: string; // ISO timestamp
}

// Data sent when a booking's status changes
export interface BookingStatusPayload {
  bookingId: string;
  rideId: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  updatedAt: string;
}

// Data sent when a ride's real-time status changes
export interface RideStatusPayload {
  rideId: string;
  bookingId?: string;
  driverLocation?: { lat: number; lng: number };
  status:
    | "OPEN"
    | "FULL"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "driver_assigned"
    | "en_route"
    | "arrived"
    | "in_progress"
    | "finished"
    | "cancelled";
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

export interface RideUpdatePayload {
  rideId: string;
  updatedAt: string;
  changedFields: string[]; // list of fields that were updated, e.g. ["pickupLocation", "departureTime"]
  updateMessage?: string;
}

export interface ModerationActionPayload {
  actionType: "WARNING" | "SUSPENSION" | "BAN";
  reason: string;
  note?: string;
  suspendedUntil?: string | null;
  updatedAt: string;
}

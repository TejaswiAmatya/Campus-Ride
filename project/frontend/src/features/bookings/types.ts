export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface BookingListItem {
  id: string;
  status: BookingStatus;
  seatsBooked: number;
  totalFare: string;
  createdAt: string;
  passenger?: { id: string; name: string };
  ride: {
    id: string;
    originAddress: string;
    destinationAddress: string;
    departureTime: string;
    driver: { id: string; name: string };
  };
}

export interface BookingDetail {
  id: string;
  status: BookingStatus;
  seatsBooked: number;
  totalFare: string;
  platformFee: string;
  driverEarnings: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  passenger: { id: string; name: string; avatarUrl: string | null };
  ride: {
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
    status: string;
    driver: { id: string; name: string; avatarUrl: string | null };
  };
}

export interface BookingNewPayload {
  bookingId: string;
  passengerId: string;
  rideId: string;
  passengerName?: string;
  pickupLocation?: { lat: number; lng: number };
  dropoffLocation?: { lat: number; lng: number };
  requestedAt?: string;
}

export interface BookingStatusPayload {
  bookingId: string;
  status: "pending" | "confirmed" | "cancelled" | "declined" | "completed";
  rideId?: string;
  updatedAt?: string;
}

import {
  notifyBookingNew,
  notifyBookingStatus,
  notifyRideStatus,
} from "./socket";

import type { BookingStatusPayload, RideStatusPayload } from "./socket.types";

// Stub — build minimal payload and fire the socket event
async function bookingNew(driverId: string, bookingId: string) {
  console.log("[notify] bookingNew", { driverId, bookingId });

  notifyBookingNew(driverId, {
    bookingId,
    passengerId: "", // stub — fill in later when you have real data
    passengerName: "", // stub — fill in later when you have real data
    pickupLocation: { lat: 0, lng: 0 }, // stub
    dropoffLocation: { lat: 0, lng: 0 }, // stub
    requestedAt: new Date().toISOString(),
  });
}

async function bookingStatus(
  passengerId: string,
  booking: BookingStatusPayload,
) {
  console.log("[notify] bookingStatus", { passengerId, booking });

  notifyBookingStatus(passengerId, booking);
}

async function rideStatus(rideId: string, status: RideStatusPayload) {
  console.log("[notify] rideStatus", { rideId, status });

  notifyRideStatus(rideId, status);
}

export const notify = {
  bookingNew: notifyBookingNew,
  bookingStatus: notifyBookingStatus,
  rideStatus: notifyRideStatus,
};

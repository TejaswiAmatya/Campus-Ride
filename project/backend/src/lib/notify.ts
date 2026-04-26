import {
  notifyBookingNew,
  notifyBookingStatus,
  notifyRideStatus,
} from "./socket";

import type {
  BookingNewPayload,
  BookingStatusPayload,
  RideStatusPayload,
} from "./socket.types";

async function bookingNew(
  driverId: string,
  booking: Pick<BookingNewPayload, "bookingId" | "passengerId" | "rideId">,
) {
  console.log("[notify] bookingNew", { driverId, booking });

  notifyBookingNew(driverId, booking);
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
  bookingNew,
  bookingStatus,
  rideStatus,
};

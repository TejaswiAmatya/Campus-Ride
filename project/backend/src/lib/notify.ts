import {
  notifyBookingNew,
  notifyBookingStatus,
  notifyRideStatus,
  notifyRideUpdate,
} from "./socket";

import type {
  BookingNewPayload,
  BookingStatusPayload,
  RideStatusPayload,
  RideUpdatePayload,
} from "./socket.types";

async function bookingNew(
  driverId: string,
  booking: BookingNewPayload,
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

async function rideUpdate(rideId: string, update: RideUpdatePayload) {
  console.log("[notify] rideUpdate", { rideId, update });

  notifyRideUpdate(rideId, update);
}

export const notify = {
  bookingNew,
  bookingStatus,
  rideStatus,
  rideUpdate,
};

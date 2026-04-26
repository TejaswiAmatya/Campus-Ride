import {
  notifyBookingNew,
  notifyBookingStatus,
  notifyRideStatus,
  getIO,
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

  const io = getIO();
  io.to(`user:${passengerId}`).emit("booking:status", { booking });
}

async function rideStatus(rideId: string, status: RideStatusPayload) {
  console.log("[notify] rideStatus", { rideId, status });

  const io = getIO();
  io.to(`user:${rideId}`).emit("ride:status", { status });
}

export const notify = {
  bookingNew,
  bookingStatus,
  rideStatus,
};

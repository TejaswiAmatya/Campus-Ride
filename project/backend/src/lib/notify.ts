//this file is here so that when notify.bookingNew is called they just have to keep passengerId and bookingId instead of writing the whole payload
import {
  notifyBookingNew,
  notifyBookingStatus,
  notifyRideStatus,
} from "./socket";
import { getIO } from "./socket";
import type { BookingStatusPayload, RideStatusPayload } from "./socket.types";

// Stub — build minimal payload and fire the socket event
async function bookingNew(driverId: string, bookingId: string) {
  console.log("[notify] bookingNew", { driverId, bookingId });

  const io = getIO();
  io.to(`user:${driverId}`).emit("booking:new", { bookingId });
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

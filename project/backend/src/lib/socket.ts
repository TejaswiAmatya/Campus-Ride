import { get, Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import {
  BookingNewPayload,
  BookingStatusPayload,
  RideStatusPayload,
} from "./socket.types";
let io: Server | null = null;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    // Frontend emits: socket.emit("join:user", { userId: "42" })
    socket.on("join:user", ({ userId }: { userId: string }) => {
      socket.join(`user:${userId}`);
      console.log(`[socket] ${socket.id} joined room user:${userId}`);
    });

    // Frontend emits: socket.emit("join:ride", { rideId: "789" })
    socket.on("join:ride", ({ rideId }: { rideId: string }) => {
      socket.join(`ride:${rideId}`);
      console.log(`[socket] ${socket.id} joined room ride:${rideId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized. Call initSocket first.",
    );
  }

  return io;
}

//notifies the driver of a new booking request
export function notifyBookingNew(driverId: string, payload: BookingNewPayload) {
  io = getIO();
  io.to(driverId).emit("booking:new", payload);
}

//notifies the user of a booking status change
export function notifyBookingStatus(
  userId: string,
  payload: BookingStatusPayload,
) {
  io = getIO();
  io.to(userId).emit("booking:status", payload);
}

//notifies the ride of a ride status (ride is the room for both the passenger and driver to join)
export function notifyRideStatus(rideId: string, payload: RideStatusPayload) {
  io = getIO();
  io.to(rideId).emit("ride:status", payload);
}

import nodemailer from "nodemailer";
import { Worker } from "bullmq";
import redisConnection from "../config/redis";
import { prisma } from "../lib/prisma";
import { buildEmail } from "../lib/emailTemplates";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

let worker: Worker | null = null;

export function startEmailWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(
    "email-notifications",
    async (job) => {
      if (job.name === "welcomeEmail") {
        const { email, userId } = job.data;
        console.log(
          `[emailWorker] welcome email → ${email} for user ${userId}`,
        );
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const built = buildEmail({
          type: "welcome",
          to: email,
          userName: user?.name ?? "there",
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          ...built,
        });
      } else if (job.name === "bookingConfirmed") {
        const { bookingId } = job.data;
        console.log(
          `[emailWorker] bookingConfirmed email → bookingId: ${bookingId}`,
        );
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { passenger: true, ride: { include: { driver: true } } },
        });
        if (!booking) throw new Error(`Booking ${bookingId} not found`);
        const built = buildEmail({
          type: "booking-confirmed",
          to: booking.passenger.email,
          passengerName: booking.passenger.name,
          rideDate: new Date(booking.ride.departureTime).toLocaleString(),
          driverName: booking.ride.driver.name,
          price: `${booking.totalFare} NOK`,
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: booking.passenger.email,
          ...built,
        });
      } else if (job.name === "bookingCancelled") {
        const { bookingId } = job.data;
        console.log(
          `[emailWorker] bookingCancelled email → bookingId: ${bookingId}`,
        );
        // Later: look up booking details and send cancellation email
      } else if (job.name === "rideStarted") {
        const { rideId } = job.data;
        console.log(`[emailWorker] rideStarted email → rideId: ${rideId}`);
        const bookings = await prisma.booking.findMany({
          where: { rideId, status: "CONFIRMED" },
          include: { passenger: true, ride: { include: { driver: true } } },
        });
        if (bookings.length === 0) {
          console.log(`[emailWorker] no confirmed bookings for ride ${rideId}`);
        } else {
          await Promise.all(
            bookings.map(async (booking) => {
              const built = buildEmail({
                type: "ride-started",
                to: booking.passenger.email,
                passengerName: booking.passenger.name,
                rideDate: new Date(booking.ride.departureTime).toLocaleString(),
                driverName: booking.ride.driver.name,
              });
              await transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: booking.passenger.email,
                ...built,
              });
            }),
          );
        }
      } else if (job.name === "rideUpdated") {
        const { rideId, updateMessage } = job.data as {
          rideId: string;
          updateMessage?: string;
        };
        console.log(`[emailWorker] rideUpdated email → rideId: ${rideId}`);
        const bookings = await prisma.booking.findMany({
          where: { rideId, status: "CONFIRMED" },
          include: { passenger: true, ride: { include: { driver: true } } },
        });
        if (bookings.length === 0) {
          console.log(`[emailWorker] no confirmed bookings for ride ${rideId}`);
        } else {
          await Promise.all(
            bookings.map(async (booking) => {
              const built = buildEmail({
                type: "ride-updated",
                to: booking.passenger.email,
                passengerName: booking.passenger.name,
                rideDate: new Date(booking.ride.departureTime).toLocaleString(),
                driverName: booking.ride.driver.name,
                originAddress: booking.ride.originAddress,
                destinationAddress: booking.ride.destinationAddress,
                updateMessage,
              });
              await transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: booking.passenger.email,
                ...built,
              });
            }),
          );
        }
      } else if (job.name === "driverRejected") {
        const { driverId, email, name, reason } = job.data;
        console.log(
          `[emailWorker] driverRejected email → ${email} for driver ${driverId}`,
        );
        const built = buildEmail({
          type: "driver-rejected",
          to: email,
          userName: name,
          reason,
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          ...built,
        });
      } else if (job.name === "driverApproved") {
        const { driverId, email, name } = job.data;
        console.log(
          `[emailWorker] driverApproved email → ${email} for driver ${driverId}`,
        );
        const built = buildEmail({
          type: "driver-approved",
          to: email,
          userName: name,
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          ...built,
        });
      } else if (job.name === "academicApproved") {
        const { userId, email, name } = job.data;
        console.log(
          `[emailWorker] academicApproved email → ${email} for user ${userId}`,
        );
        const built = buildEmail({
          type: "academic-approved",
          to: email,
          userName: name,
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          ...built,
        });
      } else if (job.name === "academicRejected") {
        const { userId, email, name, reason } = job.data;
        console.log(
          `[emailWorker] academicRejected email → ${email} for user ${userId}`,
        );
        const built = buildEmail({
          type: "academic-rejected",
          to: email,
          userName: name,
          reason,
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          ...built,
        });
      } else if (job.name === "moderationAction") {
        const {
          userId,
          email,
          userName,
          actionType,
          reason,
          note,
          suspendedUntil,
        } = job.data as {
          userId: string;
          email: string;
          userName: string;
          actionType: "WARNING" | "SUSPENSION" | "BAN";
          reason: string;
          note?: string;
          suspendedUntil?: string | null;
        };
        console.log(
          `[emailWorker] moderationAction email → ${email} for user ${userId}`,
        );
        const built = buildEmail({
          type: "moderation-action",
          to: email,
          userName,
          actionType,
          reason,
          note,
          suspendedUntil,
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          ...built,
        });
      } else {
        console.warn(`[emailWorker] unknown job type: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[emailWorker] job completed: ${job.name} (${job.id})`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[emailWorker] job failed: ${job?.name}`, err.message);
  });

  return worker;
}

export default startEmailWorker;

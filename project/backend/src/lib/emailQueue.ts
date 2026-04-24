import { Queue } from "bullmq";
import redisConnection from "../config/redis";

export const emailQueueInstance = new Queue("email-notifications", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

async function welcomeEmail(userId: string, email: string) {
  console.log("[emailQueue] welcome queued", { userId, email });
  await emailQueueInstance.add("welcome", { userId, email });
}

async function bookingConfirmed(bookingId: string) {
  console.log("[emailQueue] bookingConfirmed queued", { bookingId });
  await emailQueueInstance.add("bookingConfirmed", { bookingId });
}

async function bookingCancelled(bookingId: string) {
  console.log("[emailQueue] bookingCancelled queued", { bookingId });
  await emailQueueInstance.add("bookingCanceled", { bookingId });
}

async function rideStarted(rideId: string) {
  console.log("[emailQueue] rideStarted queued", { rideId });
  await emailQueueInstance.add("rideStarted", { rideId });
}

async function driverApproved(driverId: string, email: string, name: string) {
  console.log("[emailQueue] driverApproved queued", { driverId, email });
  await emailQueueInstance.add("driverApproved", { driverId, email, name });
}

async function driverRejected(driverId: string, email: string, name: string) {
  console.log("[emailQueue] driverRejected queued", { driverId, email });
  await emailQueueInstance.add("driverRejected", { driverId, email, name });
}
// 4. Export as one clean object
export const emailQueue = {
  welcomeEmail,
  bookingConfirmed,
  bookingCancelled,
  rideStarted,
  driverApproved,
  driverRejected,
};

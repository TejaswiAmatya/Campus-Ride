import { Queue } from "bullmq";
import redisConnection from "../config/redis";

export const emailQueueInstance = new Queue("email-notifications", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

async function welcome(userId: string, email: string) {
  console.log("[emailQueue] welcome queued", { userId, email });
  await emailQueueInstance.add("welcome", { userId, email });
}

async function bookingConfirmed(bookingId: string) {
  console.log("[emailQueue] bookingConfirmed queued", { bookingId });
  await emailQueueInstance.add("bookingConfirmed", { bookingId });
}

async function rideStarted(rideId: string) {
  console.log("[emailQueue] rideStarted queued", { rideId });
  await emailQueueInstance.add("rideStarted", { rideId });
}

// 4. Export as one clean object
export const emailQueue = { welcome, bookingConfirmed, rideStarted };

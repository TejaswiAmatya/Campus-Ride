import { Queue } from "bullmq";

const isEmailQueueDisabled =
  process.env.DISABLE_EMAIL_QUEUE === "true" ||
  process.env.NODE_ENV === "test" ||
  process.env.VITEST !== undefined;

let emailQueueInstance: Queue | null = null;

async function getEmailQueueInstance() {
  if (isEmailQueueDisabled) {
    return null;
  }

  if (emailQueueInstance) {
    return emailQueueInstance;
  }

  const { default: redisConnection } = await import("../config/redis");
  emailQueueInstance = new Queue("email-notifications", {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  });

  return emailQueueInstance;
}

async function enqueue(jobName: string, payload: Record<string, unknown>) {
  if (isEmailQueueDisabled) {
    return;
  }

  const queue = await getEmailQueueInstance();
  await queue?.add(jobName, payload);
}

async function welcomeEmail(userId: string, email: string) {
  console.log("[emailQueue] welcome queued", { userId, email });
  await enqueue("welcome", { userId, email });
}

async function bookingConfirmed(bookingId: string) {
  console.log("[emailQueue] bookingConfirmed queued", { bookingId });
  await enqueue("bookingConfirmed", { bookingId });
}

async function bookingCancelled(bookingId: string) {
  console.log("[emailQueue] bookingCancelled queued", { bookingId });
  await enqueue("bookingCanceled", { bookingId });
}

async function rideStarted(rideId: string) {
  console.log("[emailQueue] rideStarted queued", { rideId });
  await enqueue("rideStarted", { rideId });
}

async function rideUpdated(rideId: string, updateMessage?: string) {
  console.log("[emailQueue] rideUpdated queued", { rideId });
  await enqueue("rideUpdated", { rideId, updateMessage });
}

async function driverApproved(driverId: string, email: string, name: string) {
  console.log("[emailQueue] driverApproved queued", { driverId, email });
  await enqueue("driverApproved", { driverId, email, name });
}

async function driverRejected(
  driverId: string,
  email: string,
  name: string,
  reason?: string,
) {
  console.log("[emailQueue] driverRejected queued", { driverId, email });
  await enqueue("driverRejected", { driverId, email, name });
}
// 4. Export as one clean object
export const emailQueue = {
  welcomeEmail,
  bookingConfirmed,
  bookingCancelled,
  rideStarted,
  rideUpdated,
  driverApproved,
  driverRejected,
};

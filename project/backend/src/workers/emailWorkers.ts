import { Worker } from "bullmq";
import redisConnection from "../config/redis";

const worker = new Worker(
  "email-notifications",
  async (job) => {
    if (job.name === "welcome") {
      const { userId, email } = job.data;
      console.log(`[emailWorker] welcome email → ${email} for user ${userId}`);
      // Later: plug in SendGrid/SES here
    } else if (job.name === "bookingConfirmed") {
      const { bookingId } = job.data;
      console.log(
        `[emailWorker] bookingConfirmed email → bookingId: ${bookingId}`,
      );
      // Later: look up booking details and send email
    } else if (job.name === "rideStarted") {
      const { rideId } = job.data;
      console.log(`[emailWorker] rideStarted email → rideId: ${rideId}`);
      // Later: look up ride details and send email
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

export default worker;

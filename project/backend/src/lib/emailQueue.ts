import { Queue } from "bullmq";
import redisConnection from "../config/redis";

export const emailQueue = new Queue("email-notifications", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

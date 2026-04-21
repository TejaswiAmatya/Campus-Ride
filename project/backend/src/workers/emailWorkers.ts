import { Worker } from "bullmq";
import redisConnection from "../config/redis";

new Worker(
  "email-notifications",
  async (job) => {
    const { to, subject, text } = job.data;
    console.log(
      `Sending email to ${to} with subject "${subject}" and text "${text}"`,
    );
    // Here you would integrate with an actual email service like SendGrid, SES, etc.
  },
  {
    connection: redisConnection,
  },
);

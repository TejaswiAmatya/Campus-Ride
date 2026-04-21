import { Redis } from "ioredis";

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => console.log("Redis connected"));
redisConnection.on("error", (err) => console.error("Redis error:", err));

export default redisConnection;

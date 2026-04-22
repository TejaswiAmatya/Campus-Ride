import { Redis } from "ioredis";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => console.log("Redis connected"));
redisConnection.on("error", (err) => console.error("Redis error:", err));

export default redisConnection;

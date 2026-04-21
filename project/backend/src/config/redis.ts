import { Redis } from "ioredis";
import { lookup } from "node:dns/promises";

const debugRunId = process.env.DEBUG_RUN_ID || "initial";

const debugLog = (
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) => {
  // #region agent log
  fetch("http://127.0.0.1:7835/ingest/c5cd4c8d-5937-4e0e-95b9-065c53005c2a", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "e2dea8",
    },
    body: JSON.stringify({
      sessionId: "e2dea8",
      runId: debugRunId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
};

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

debugLog("H1", "backend/src/config/redis.ts:34", "Redis config resolved", {
  redisHost,
  redisPort,
  hasRedisPassword: Boolean(redisPassword),
  hasRedisUrl: Boolean(process.env.REDIS_URL),
});

lookup(redisHost)
  .then((result) => {
    debugLog("H2", "backend/src/config/redis.ts:43", "DNS lookup succeeded", {
      redisHost,
      address: result.address,
      family: result.family,
    });
  })
  .catch((error: unknown) => {
    const err = error as NodeJS.ErrnoException;
    debugLog("H2", "backend/src/config/redis.ts:51", "DNS lookup failed", {
      redisHost,
      code: err.code || "UNKNOWN",
      message: err.message,
    });
  });

const redisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => console.log("Redis connected"));
redisConnection.on("error", (err) => console.error("Redis error:", err));

redisConnection.on("connect", () => {
  debugLog("H3", "backend/src/config/redis.ts:68", "Redis connect event", {
    redisHost,
    redisPort,
  });
});

redisConnection.on("error", (err) => {
  debugLog("H4", "backend/src/config/redis.ts:75", "Redis error event", {
    redisHost,
    redisPort,
    code: (err as NodeJS.ErrnoException).code || "UNKNOWN",
    message: err.message,
  });
});

export default redisConnection;

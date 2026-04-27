import express from "express";
import request from "supertest";
import { z } from "zod";
import { describe, expect, it } from "vitest";

import { AppError, errorHandler } from "./error";

function createApp() {
  const app = express();

  app.get("/zod", (_req, _res, next) => {
    try {
      z.object({
        seats: z.number().min(1),
      }).parse({ seats: 0 });
    } catch (error) {
      next(error);
    }
  });

  app.get("/app-error", (_req, _res, next) => {
    next(new AppError("FORBIDDEN", "Not allowed", 403, { reason: "policy" }));
  });

  app.get("/prisma-conflict", (_req, _res, next) => {
    next({ code: "P2002" });
  });

  app.get("/prisma-missing", (_req, _res, next) => {
    next({ code: "P2025" });
  });

  app.get("/prisma-transaction", (_req, _res, next) => {
    next({ code: "P2034" });
  });

  app.get("/unknown", (_req, _res, next) => {
    next(new Error("boom"));
  });

  app.use(errorHandler);
  return app;
}

describe("error middleware integration", () => {
  it("translates zod validation errors into a 422 envelope", async () => {
    const res = await request(createApp()).get("/zod");

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.seats).toBeDefined();
  });

  it("returns structured application errors as-is", async () => {
    const res = await request(createApp()).get("/app-error");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Not allowed",
        details: { reason: "policy" },
      },
    });
  });

  it("maps prisma codes to their expected http errors", async () => {
    const conflict = await request(createApp()).get("/prisma-conflict");
    const missing = await request(createApp()).get("/prisma-missing");
    const transaction = await request(createApp()).get("/prisma-transaction");

    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("CONFLICT");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
    expect(transaction.status).toBe(409);
    expect(transaction.body.error.code).toBe("TRANSACTION_CONFLICT");
  });

  it("falls back to a 500 for unexpected errors", async () => {
    const res = await request(createApp()).get("/unknown");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });
});

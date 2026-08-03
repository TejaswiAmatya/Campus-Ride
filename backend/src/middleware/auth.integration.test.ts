import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabaseAdmin: {
    auth: {
      getUser: mocks.getUser,
    },
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
    },
  },
}));

import { errorHandler } from "./error";
import { requireAuth, requireRole } from "./auth";

function createApp() {
  const app = express();

  app.get("/protected", requireAuth, (req, res) => {
    res.json({ data: req.user });
  });

  app.get("/admin", requireAuth, requireRole("ADMIN"), (req, res) => {
    res.json({ data: req.user });
  });

  app.use(errorHandler);

  return app;
}

describe("auth middleware integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing bearer headers", async () => {
    const res = await request(createApp()).get("/protected");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("rejects invalid or expired supabase tokens", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("expired"),
    });

    const res = await request(createApp())
      .get("/protected")
      .set("Authorization", "Bearer bad-token");

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid or expired token");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejects moderated suspended accounts with details", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.findUnique.mockResolvedValue({
      role: "PASSENGER",
      accountStatus: "SUSPENDED",
      suspendedUntil: new Date("2026-06-01T12:00:00.000Z"),
    });

    const res = await request(createApp())
      .get("/protected")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");
    expect(res.body.error.details).toEqual({
      suspendedUntil: "2026-06-01T12:00:00.000Z",
    });
  });

  it("allows expired suspensions through and populates req.user", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-2" } },
      error: null,
    });
    mocks.findUnique.mockResolvedValue({
      role: "PASSENGER",
      accountStatus: "SUSPENDED",
      suspendedUntil: new Date("2020-01-01T00:00:00.000Z"),
    });

    const res = await request(createApp())
      .get("/protected")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: "user-2",
      role: "PASSENGER",
    });
  });

  it("enforces requireRole after successful authentication", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-3" } },
      error: null,
    });
    mocks.findUnique.mockResolvedValue({
      role: "PASSENGER",
      accountStatus: "ACTIVE",
      suspendedUntil: null,
    });

    const res = await request(createApp())
      .get("/admin")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toBe("Insufficient permissions");
  });

  it("returns 500 when the upstream auth provider throws unexpectedly", async () => {
    mocks.getUser.mockRejectedValue(new Error("supabase down"));

    const res = await request(createApp())
      .get("/protected")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

import { createReport } from "./controller";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    ride: {
      findUnique: vi.fn(),
    },
    report: {
      create: vi.fn(),
    },
  },
}));

describe("createReport", () => {
  const validUserId = "550e8400-e29b-41d4-a716-446655440000";
  const otherUserId = "550e8400-e29b-41d4-a716-446655440001";
  const validRideId = "550e8400-e29b-41d4-a716-446655440002";

  const makeResponse = () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    return { status, json };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects self-reports", async () => {
    const req = {
      user: { id: validUserId },
      body: {
        targetUserId: validUserId,
        targetRideId: validRideId,
        reason: "Unsafe driving and repeated harassment",
      },
    } as Request;
    const res = makeResponse() as unknown as Response;
    const next = vi.fn() as NextFunction;

    await createReport(req, res, next);

    expect(vi.mocked(prisma.user.findUnique)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.ride.findUnique)).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    const error = vi.mocked(next).mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("FORBIDDEN");
    expect((error as AppError).statusCode).toBe(403);
  });

  it("rejects reports for missing rides", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ role: "DRIVER" });
    vi.mocked(prisma.ride.findUnique).mockResolvedValueOnce(null);

    const req = {
      user: { id: validUserId },
      body: {
        targetUserId: otherUserId,
        targetRideId: validRideId,
        reason: "Driver never arrived and stopped replying",
      },
    } as Request;
    const res = makeResponse() as unknown as Response;
    const next = vi.fn() as NextFunction;

    await createReport(req, res, next);

    expect(vi.mocked(prisma.user.findUnique)).toHaveBeenCalledOnce();
    expect(vi.mocked(prisma.ride.findUnique)).toHaveBeenCalledOnce();
    expect(vi.mocked(prisma.report.create)).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    const error = vi.mocked(next).mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("NOT_FOUND");
    expect((error as AppError).message).toBe("Target ride not found");
    expect((error as AppError).statusCode).toBe(404);
  });

  it("creates a report when the target user and ride exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ role: "DRIVER" });
    vi.mocked(prisma.ride.findUnique).mockResolvedValueOnce({ id: validRideId });

    const createdReport = {
      id: "report-1",
      reporterId: validUserId,
      targetUserId: otherUserId,
      targetRideId: validRideId,
      targetUserRole: "DRIVER",
      reason: "Driver made me feel unsafe during the ride",
    };
    vi.mocked(prisma.report.create).mockResolvedValueOnce(createdReport);

    const req = {
      user: { id: validUserId },
      body: {
        targetUserId: otherUserId,
        targetRideId: validRideId,
        reason: "Driver made me feel unsafe during the ride",
      },
    } as Request;
    const res = makeResponse() as unknown as Response;
    const next = vi.fn() as NextFunction;

    await createReport(req, res, next);

    expect(vi.mocked(prisma.report.create)).toHaveBeenCalledWith({
      data: {
        reporterId: validUserId,
        targetUserId: otherUserId,
        targetRideId: validRideId,
        targetUserRole: "DRIVER",
        reason: "Driver made me feel unsafe during the ride",
      },
    });
    expect((res as unknown as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(201);
    expect(
      ((res as unknown as { status: ReturnType<typeof vi.fn> }).status.mock.results[0]
        ?.value as { json: ReturnType<typeof vi.fn> }).json,
    ).toHaveBeenCalledWith({ data: createdReport });
    expect(next).not.toHaveBeenCalled();
  });
});

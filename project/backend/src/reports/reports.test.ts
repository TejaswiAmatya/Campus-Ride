import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { Prisma, RideStatus, Role, type Report, type Ride, type User } from "@prisma/client";

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
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  };

  const makeUser = (overrides: Partial<User> = {}): User => ({
    id: otherUserId,
    email: "driver@example.com",
    name: "Driver Demo",
    phone: null,
    role: Role.DRIVER,
    avatarPath: null,
    createdAt: new Date("2024-01-01T10:00:00.000Z"),
    updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    ...overrides,
  });

  const makeRide = (overrides: Partial<Ride> = {}): Ride => ({
    id: validRideId,
    driverId: otherUserId,
    originAddress: "Campus North",
    originLat: 59.9139,
    originLng: 10.7522,
    destinationAddress: "Campus South",
    destinationLat: 59.915,
    destinationLng: 10.76,
    departureTime: new Date("2024-01-02T09:00:00.000Z"),
    totalSeats: 4,
    availableSeats: 2,
    pricePerSeat: new Prisma.Decimal("25.00"),
    status: RideStatus.OPEN,
    createdAt: new Date("2024-01-01T10:00:00.000Z"),
    updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    ...overrides,
  });

  const makeReport = (overrides: Partial<Report> = {}): Report => ({
    id: "report-1",
    reporterId: validUserId,
    targetUserId: otherUserId,
    targetRideId: validRideId,
    targetUserRole: Role.DRIVER,
    reason: "Driver made me feel unsafe during the ride",
    status: "OPEN",
    note: null,
    createdAt: new Date("2024-01-01T10:00:00.000Z"),
    updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    ...overrides,
  });

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
    const res = makeResponse();
    const next = vi.fn();

    await createReport(req, res as unknown as Response, next as NextFunction);

    expect(vi.mocked(prisma.user.findUnique)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.ride.findUnique)).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(AppError);
    const appError = error as AppError;
    expect(appError.code).toBe("FORBIDDEN");
    expect(appError.statusCode).toBe(403);
  });

  it("rejects reports for missing rides", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(makeUser());
    vi.mocked(prisma.ride.findUnique).mockResolvedValueOnce(null);

    const req = {
      user: { id: validUserId },
      body: {
        targetUserId: otherUserId,
        targetRideId: validRideId,
        reason: "Driver never arrived and stopped replying",
      },
    } as Request;
    const res = makeResponse();
    const next = vi.fn();

    await createReport(req, res as unknown as Response, next as NextFunction);

    expect(vi.mocked(prisma.user.findUnique)).toHaveBeenCalledOnce();
    expect(vi.mocked(prisma.ride.findUnique)).toHaveBeenCalledOnce();
    expect(vi.mocked(prisma.report.create)).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(AppError);
    const appError = error as AppError;
    expect(appError.code).toBe("NOT_FOUND");
    expect(appError.message).toBe("Target ride not found");
    expect(appError.statusCode).toBe(404);
  });

  it("creates a report when the target user and ride exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(makeUser());
    vi.mocked(prisma.ride.findUnique).mockResolvedValueOnce(makeRide());

    const createdReport = makeReport();
    vi.mocked(prisma.report.create).mockResolvedValueOnce(createdReport);

    const req = {
      user: { id: validUserId },
      body: {
        targetUserId: otherUserId,
        targetRideId: validRideId,
        reason: "Driver made me feel unsafe during the ride",
      },
    } as Request;
    const res = makeResponse();
    const next = vi.fn();

    await createReport(req, res as unknown as Response, next as NextFunction);

    expect(vi.mocked(prisma.report.create)).toHaveBeenCalledWith({
      data: {
        reporterId: validUserId,
        targetUserId: otherUserId,
        targetRideId: validRideId,
        targetUserRole: Role.DRIVER,
        reason: "Driver made me feel unsafe during the ride",
      },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: createdReport });
    expect(next).not.toHaveBeenCalled();
  });
});

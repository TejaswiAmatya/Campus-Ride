import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

import { academicDecision } from "./controller";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  academicApproved: vi.fn(),
  academicRejected: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}));

vi.mock("../lib/emailQueue", () => ({
  emailQueue: {
    academicApproved: mocks.academicApproved,
    academicRejected: mocks.academicRejected,
  },
}));

describe("academicDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeResponse() {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  }

  it("approves an academic verification", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@university.edu",
      academicVerificationStatus: "PENDING",
    });

    const verifiedAt = new Date("2026-04-26T19:30:00.000Z");
    mocks.userUpdate.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@university.edu",
      academicRole: "STUDENT",
      academicVerificationStatus: "VERIFIED",
      academicVerifiedAt: verifiedAt,
      academicRejectionReason: null,
    });

    const req = {
      params: { userId: "user-1" },
      body: { approved: true },
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    await academicDecision(req, res as unknown as Response, next as NextFunction);

    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        academicVerificationStatus: "VERIFIED",
        academicVerifiedAt: expect.any(Date),
        academicRejectionReason: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        academicRole: true,
        academicVerificationStatus: true,
        academicVerifiedAt: true,
        academicRejectionReason: true,
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      data: {
        id: "user-1",
        name: "Alice",
        email: "alice@university.edu",
        academicRole: "STUDENT",
        academicVerificationStatus: "VERIFIED",
        academicVerifiedAt: verifiedAt,
        academicRejectionReason: null,
      },
    });
    expect(mocks.academicApproved).toHaveBeenCalledWith(
      "user-1",
      "alice@university.edu",
      "Alice",
    );
    expect(mocks.academicRejected).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an academic verification and stores the rejection reason", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@university.edu",
      academicVerificationStatus: "PENDING",
    });

    mocks.userUpdate.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@university.edu",
      academicRole: "STUDENT",
      academicVerificationStatus: "REJECTED",
      academicVerifiedAt: null,
      academicRejectionReason: "Student ID image was unreadable",
    });

    const req = {
      params: { userId: "user-1" },
      body: {
        approved: false,
        reason: "Student ID image was unreadable",
      },
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    await academicDecision(req, res as unknown as Response, next as NextFunction);

    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        academicVerificationStatus: "REJECTED",
        academicVerifiedAt: null,
        academicRejectionReason: "Student ID image was unreadable",
      },
      select: {
        id: true,
        name: true,
        email: true,
        academicRole: true,
        academicVerificationStatus: true,
        academicVerifiedAt: true,
        academicRejectionReason: true,
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      data: {
        id: "user-1",
        name: "Alice",
        email: "alice@university.edu",
        academicRole: "STUDENT",
        academicVerificationStatus: "REJECTED",
        academicVerifiedAt: null,
        academicRejectionReason: "Student ID image was unreadable",
      },
    });
    expect(mocks.academicRejected).toHaveBeenCalledWith(
      "user-1",
      "alice@university.edu",
      "Alice",
      "Student ID image was unreadable",
    );
    expect(mocks.academicApproved).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

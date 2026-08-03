import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

import {
  academicDecision,
  getUnreadAnnouncements,
  markAnnouncementRead,
  sendAnnouncement,
} from "./controller";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  announcementCreate: vi.fn(),
  announcementFindMany: vi.fn(),
  announcementReadUpsert: vi.fn(),
  academicApproved: vi.fn(),
  academicRejected: vi.fn(),
  notifyAnnouncement: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    announcement: {
      create: mocks.announcementCreate,
      findMany: mocks.announcementFindMany,
    },
    announcementRead: {
      upsert: mocks.announcementReadUpsert,
    },
  },
}));

vi.mock("../lib/emailQueue", () => ({
  emailQueue: {
    academicApproved: mocks.academicApproved,
    academicRejected: mocks.academicRejected,
  },
}));

vi.mock("../lib/notify", () => ({
  notify: {
    announcement: mocks.notifyAnnouncement,
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

describe("sendAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeResponse() {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  }

  it("creates and broadcasts an announcement", async () => {
    const createdAt = new Date("2026-04-27T09:00:00.000Z");
    mocks.announcementCreate.mockResolvedValue({
      id: "announcement-1",
      subject: "Maintenance",
      message: "Campus Ride will be unavailable tonight.",
      createdAt,
    });

    const req = {
      user: { id: "admin-1", role: "ADMIN" },
      body: {
        subject: "Maintenance",
        message: "Campus Ride will be unavailable tonight.",
      },
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    await sendAnnouncement(req, res as unknown as Response, next as NextFunction);

    expect(mocks.announcementCreate).toHaveBeenCalledWith({
      data: {
        subject: "Maintenance",
        message: "Campus Ride will be unavailable tonight.",
        createdById: "admin-1",
      },
      select: {
        id: true,
        subject: true,
        message: true,
        createdAt: true,
      },
    });
    expect(mocks.notifyAnnouncement).toHaveBeenCalledWith({
      id: "announcement-1",
      subject: "Maintenance",
      message: "Campus Ride will be unavailable tonight.",
      createdAt: createdAt.toISOString(),
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        id: "announcement-1",
        subject: "Maintenance",
        message: "Campus Ride will be unavailable tonight.",
        createdAt: createdAt.toISOString(),
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("getUnreadAnnouncements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeResponse() {
    return {
      json: vi.fn(),
    };
  }

  it("returns unread announcements oldest first", async () => {
    mocks.announcementFindMany.mockResolvedValue([
      {
        id: "announcement-1",
        subject: "First",
        message: "First message",
        createdAt: new Date("2026-04-26T09:00:00.000Z"),
      },
      {
        id: "announcement-2",
        subject: "Second",
        message: "Second message",
        createdAt: new Date("2026-04-26T10:00:00.000Z"),
      },
    ]);

    const req = {
      user: { id: "user-1", role: "PASSENGER" },
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    await getUnreadAnnouncements(
      req,
      res as unknown as Response,
      next as NextFunction,
    );

    expect(mocks.announcementFindMany).toHaveBeenCalledWith({
      where: {
        reads: {
          none: {
            userId: "user-1",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        subject: true,
        message: true,
        createdAt: true,
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      data: [
        {
          id: "announcement-1",
          subject: "First",
          message: "First message",
          createdAt: "2026-04-26T09:00:00.000Z",
        },
        {
          id: "announcement-2",
          subject: "Second",
          message: "Second message",
          createdAt: "2026-04-26T10:00:00.000Z",
        },
      ],
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("markAnnouncementRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeResponse() {
    return {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
  }

  it("upserts the read record for the current user", async () => {
    const req = {
      user: { id: "user-1", role: "PASSENGER" },
      params: { id: "announcement-1" },
      body: {},
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    await markAnnouncementRead(
      req,
      res as unknown as Response,
      next as NextFunction,
    );

    expect(mocks.announcementReadUpsert).toHaveBeenCalledWith({
      where: {
        announcementId_userId: {
          announcementId: "announcement-1",
          userId: "user-1",
        },
      },
      update: {
        readAt: expect.any(Date),
      },
      create: {
        announcementId: "announcement-1",
        userId: "user-1",
      },
    });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

import { deleteMyAccount } from "./userController";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  rideCount: vi.fn(),
  bookingCount: vi.fn(),
  driverProfileCount: vi.fn(),
  driverProfileUpdateMany: vi.fn(),
  transaction: vi.fn(),
  deleteAuthUser: vi.fn(),
  deleteAvatar: vi.fn(),
  deletePrivateDocuments: vi.fn(),
  uploadAcademicId: vi.fn(),
  uploadAvatar: vi.fn(),
  uploadInsurance: vi.fn(),
  uploadLicense: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    ride: {
      count: mocks.rideCount,
    },
    booking: {
      count: mocks.bookingCount,
    },
    driverProfile: {
      count: mocks.driverProfileCount,
      updateMany: mocks.driverProfileUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../lib/supabase", () => ({
  deleteAuthUser: mocks.deleteAuthUser,
  deleteAvatar: mocks.deleteAvatar,
  deletePrivateDocuments: mocks.deletePrivateDocuments,
  uploadAcademicId: mocks.uploadAcademicId,
  uploadAvatar: mocks.uploadAvatar,
  uploadInsurance: mocks.uploadInsurance,
  uploadLicense: mocks.uploadLicense,
}));

function makeResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
  };
}

describe("deleteMyAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteAuthUser.mockResolvedValue({ error: null });
    mocks.deleteAvatar.mockResolvedValue(undefined);
    mocks.deletePrivateDocuments.mockResolvedValue(undefined);
  });

  it("deactivates the user, clears files, and returns 204", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "alice@university.edu",
      name: "Alice",
      role: "PASSENGER",
      avatarPath: "https://example.com/avatar.jpg",
      accountStatus: "ACTIVE",
      academicVerificationStatus: "REJECTED",
      academicIdPath: "academic-ids/user-1/card.png",
      driverProfile: {
        status: "APPROVED",
        licencePath: "licences/user-1/licence.png",
        insurancePath: "insurance/user-1/insurance.png",
      },
    });
    mocks.rideCount.mockResolvedValue(0);
    mocks.bookingCount.mockResolvedValue(0);
    mocks.driverProfileCount.mockResolvedValue(0);
    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        user: {
          update: mocks.userUpdate,
        },
        driverProfile: {
          updateMany: mocks.driverProfileUpdateMany,
        },
      }),
    );
    mocks.userUpdate.mockResolvedValue({
      id: "user-1",
      email: "alice@university.edu",
      name: "Alice",
      role: "PASSENGER",
      avatarPath: null,
      accountStatus: "DEACTIVATED",
      academicVerificationStatus: "NOT_SUBMITTED",
      academicIdPath: null,
      driverProfile: {
        status: "APPROVED",
        licencePath: null,
        insurancePath: null,
      },
    });
    mocks.driverProfileUpdateMany.mockResolvedValue({ count: 1 });

    const req = {
      user: { id: "user-1", role: "PASSENGER" },
      body: { confirmation: "DELETE" },
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    await deleteMyAccount(req, res as unknown as Response, next as NextFunction);

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarPath: true,
        accountStatus: true,
        academicVerificationStatus: true,
        academicIdPath: true,
        driverProfile: {
          select: {
            status: true,
            licencePath: true,
            insurancePath: true,
          },
        },
      },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        accountStatus: "DEACTIVATED",
        mustChangePassword: false,
        suspendedUntil: null,
        phone: null,
        avatarPath: null,
        bio: null,
        homeAddress: null,
        homeLat: null,
        homeLng: null,
        campusAddress: null,
        campusLat: null,
        campusLng: null,
        academicRole: null,
        academicVerificationStatus: "NOT_SUBMITTED",
        academicIdPath: null,
        academicVerifiedAt: null,
        academicRejectionReason: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarPath: true,
        accountStatus: true,
        academicVerificationStatus: true,
        academicIdPath: true,
        driverProfile: {
          select: {
            status: true,
            licencePath: true,
            insurancePath: true,
          },
        },
      },
    });
    expect(mocks.driverProfileUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        licencePath: null,
        insurancePath: null,
      },
    });
    expect(mocks.deleteAuthUser).toHaveBeenCalledWith("user-1");
    expect(mocks.deleteAvatar).toHaveBeenCalledWith(
      "https://example.com/avatar.jpg",
    );
    expect(mocks.deletePrivateDocuments).toHaveBeenCalledWith([
      "academic-ids/user-1/card.png",
      "licences/user-1/licence.png",
      "insurance/user-1/insurance.png",
    ]);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 409 when the user has active rides", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "alice@university.edu",
      name: "Alice",
      role: "PASSENGER",
      avatarPath: null,
      accountStatus: "ACTIVE",
      academicVerificationStatus: "NOT_SUBMITTED",
      academicIdPath: null,
      driverProfile: null,
    });
    mocks.rideCount.mockResolvedValue(1);
    mocks.bookingCount.mockResolvedValue(0);
    mocks.driverProfileCount.mockResolvedValue(0);

    const req = {
      user: { id: "user-1", role: "PASSENGER" },
      body: { confirmation: "DELETE" },
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    await deleteMyAccount(req, res as unknown as Response, next as NextFunction);

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.deleteAuthUser).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "ACCOUNT_DELETION_BLOCKED",
        statusCode: 409,
      }),
    );
  });
});

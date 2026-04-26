// cspell:words supabase
import type { Request, Response, NextFunction } from "express";
import {
  UpdateProfileSchema,
  DriverApplicationSchema,
  SubmitAcademicVerificationSchema,
  type DriverApplicationInput,
  type SubmitAcademicVerificationInput,
  type MeResponse,
} from "./schemas";
import { prisma } from "../lib/prisma";
import { uploadAcademicId, uploadAvatar, uploadLicense } from "../lib/supabase";
import { AppError } from "../middleware/error";

const prismaUntyped = prisma as any;

const currentUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  accountStatus: true,
  suspendedUntil: true,
  avatarPath: true,
  academicRole: true,
  academicVerificationStatus: true,
  academicIdPath: true,
  academicVerifiedAt: true,
  academicRejectionReason: true,
  createdAt: true,
  driverProfile: {
    select: {
      status: true,
    },
  },
} as const;

type CurrentUserRecord = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "PASSENGER" | "DRIVER" | "ADMIN";
  accountStatus: "ACTIVE" | "WARNED" | "SUSPENDED" | "BANNED";
  suspendedUntil: Date | null;
  avatarPath: string | null;
  academicRole: "STUDENT" | "STAFF" | null;
  academicVerificationStatus:
    | "NOT_SUBMITTED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED";
  academicIdPath: string | null;
  academicVerifiedAt: Date | null;
  academicRejectionReason: string | null;
  createdAt: Date;
  driverProfile: {
    status: "PENDING" | "APPROVED" | "REJECTED";
  } | null;
};

function serializeCurrentUser(user: CurrentUserRecord): MeResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountStatus: user.accountStatus,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    avatarPath: user.avatarPath ?? null,
    driverStatus: user.driverProfile?.status ?? null,
    academicRole: user.academicRole ?? null,
    academicVerificationStatus: user.academicVerificationStatus,
    academicIdPath: user.academicIdPath ?? null,
    academicVerifiedAt: user.academicVerifiedAt?.toISOString() ?? null,
    academicRejectionReason: user.academicRejectionReason ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function serializeCurrentUserProfile(user: CurrentUserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    accountStatus: user.accountStatus,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    avatarPath: user.avatarPath ?? null,
    driverStatus: user.driverProfile?.status ?? null,
    isDriverApproved: user.driverProfile?.status === "APPROVED",
    academicRole: user.academicRole ?? null,
    academicVerificationStatus: user.academicVerificationStatus,
    academicIdPath: user.academicIdPath ?? null,
    academicVerifiedAt: user.academicVerifiedAt?.toISOString() ?? null,
    academicRejectionReason: user.academicRejectionReason ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * GET /api/users/me
 *
 * Returns the full profile of the currently authenticated user,
 * including their driver application profile if present.
 */
export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: currentUserSelect,
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(serializeCurrentUser(user));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/users/me
 *
 * Updates name, phone, or avatarPath.
 */
export async function updateCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = UpdateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: body,
      select: currentUserSelect,
    });

    res.json({
      data: serializeCurrentUserProfile(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/me/driver
 * Uploads a driver license and creates a pending driver application.
 */
export async function applyAsDriver(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Multer keeps the file in req.file
    if (!req.file) {
      throw new AppError("MISSING_FILE", "License file is required", 400);
    }

    const body: DriverApplicationInput = DriverApplicationSchema.parse(
      req.body,
    );

    const existingApplication = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (existingApplication) {
      throw new AppError(
        "DRIVER_APPLICATION_EXISTS",
        "You already have a driver application",
        409,
      );
    }

    const licencePath = await uploadLicense(
      req.user!.id,
      req.file.buffer,
      req.file.mimetype,
    );

    const [driverProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user!.id },
        data: { role: "DRIVER" },
      }),
      prisma.driverProfile.create({
        data: {
          userId: req.user!.id,
          licencePath,
          vehicleInfo: body.vehicle,
          status: "PENDING",
        },
      }),
    ]);

    res.status(201).json({ data: driverProfile });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/me/avatar
 *
 * Uploads the current user's avatar via backend service-role access and
 * persists the resulting public URL on the user profile.
 */
export async function uploadCurrentUserAvatar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.id) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    if (!req.file) {
      throw new AppError("MISSING_FILE", "Avatar file is required", 400);
    }

    const avatarPath = await uploadAvatar(
      req.user.id,
      req.file.buffer,
      req.file.mimetype,
    );

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarPath },
      select: currentUserSelect,
    });

    res.json({
      data: serializeCurrentUserProfile(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/me/academic-verification
 *
 * Uploads an academic ID document and submits or resubmits verification.
 */
export async function submitAcademicVerification(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.id) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    if (!req.file) {
      throw new AppError(
        "MISSING_FILE",
        "Academic verification document is required",
        400,
      );
    }

    const body: SubmitAcademicVerificationInput =
      SubmitAcademicVerificationSchema.parse(req.body);

    const existingUser = await prismaUntyped.user.findUnique({
      where: { id: req.user.id },
      select: {
        academicVerificationStatus: true,
      },
    });

    if (!existingUser) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    if (existingUser.academicVerificationStatus === "PENDING") {
      throw new AppError(
        "ACADEMIC_VERIFICATION_PENDING",
        "Your academic verification is already under review",
        409,
      );
    }

    if (existingUser.academicVerificationStatus === "VERIFIED") {
      throw new AppError(
        "ACADEMIC_VERIFICATION_EXISTS",
        "Your academic verification has already been approved",
        409,
      );
    }

    const academicIdPath = await uploadAcademicId(
      req.user.id,
      req.file.buffer,
      req.file.mimetype,
    );

    const user = await prismaUntyped.user.update({
      where: { id: req.user.id },
      data: {
        academicRole: body.role,
        academicVerificationStatus: "PENDING",
        academicIdPath,
        academicVerifiedAt: null,
        academicRejectionReason: null,
      },
      select: currentUserSelect,
    });

    res.status(201).json({
      data: serializeCurrentUserProfile(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id/reviews
 *
 * Returns all received reviews for a user profile (publicly accessible).
 */
export async function getUserReviews(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const reviews = await prisma.review.findMany({
      where: { revieweeId: id },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarPath: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      data: reviews.map((review) => ({
        id: review.id,
        rideId: review.rideId,
        revieweeId: review.revieweeId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        reviewer: {
          id: review.reviewer.id,
          name: review.reviewer.name,
          avatarPath: review.reviewer.avatarPath,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
}

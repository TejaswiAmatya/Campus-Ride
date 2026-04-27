import type { Request, Response, NextFunction } from "express";
import {
  UpdateProfileSchema,
  DriverApplicationSchema,
  SubmitAcademicVerificationSchema,
  DeleteMyAccountSchema,
  type DriverApplicationInput,
  type SubmitAcademicVerificationInput,
  type MeResponse,
} from "./schemas";
import { prisma } from "../lib/prisma";
import {
  deleteAuthUser,
  deleteAvatar,
  deletePrivateDocuments,
  uploadAcademicId,
  uploadAvatar,
  uploadInsurance,
  uploadLicense,
} from "../lib/supabase";
import { AppError } from "../middleware/error";
import { toAvatarPathSummary } from "../lib/userDisplay";

const prismaUntyped = prisma as any;

const currentUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  mustChangePassword: true,
  accountStatus: true,
  suspendedUntil: true,
  avatarPath: true,
  bio: true,
  homeAddress: true,
  homeLat: true,
  homeLng: true,
  campusAddress: true,
  campusLat: true,
  campusLng: true,
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
  mustChangePassword: boolean;
  accountStatus: "ACTIVE" | "WARNED" | "SUSPENDED" | "BANNED" | "DEACTIVATED";
  suspendedUntil: Date | null;
  avatarPath: string | null;
  bio: string | null;
  homeAddress: string | null;
  homeLat: number | null;
  homeLng: number | null;
  campusAddress: string | null;
  campusLat: number | null;
  campusLng: number | null;
  academicRole: "STUDENT" | "FACULTY" | "STAFF" | null;
  academicVerificationStatus:
    | "NOT_SUBMITTED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED"
    | "APPROVED";
  academicIdPath: string | null;
  academicVerifiedAt: Date | null;
  academicRejectionReason: string | null;
  createdAt: Date;
  driverProfile: {
    status: "PENDING" | "APPROVED" | "REJECTED";
  } | null;
};

type AccountDeletionUserRecord = {
  id: string;
  email: string;
  name: string;
  role: "PASSENGER" | "DRIVER" | "ADMIN";
  avatarPath: string | null;
  accountStatus: "ACTIVE" | "WARNED" | "SUSPENDED" | "BANNED" | "DEACTIVATED";
  academicVerificationStatus:
    | "NOT_SUBMITTED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED";
  academicIdPath: string | null;
  driverProfile: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    licencePath: string | null;
    insurancePath: string | null;
  } | null;
};

async function cleanupClosedAccountFiles(user: AccountDeletionUserRecord): Promise<void> {
  const cleanupTasks: Array<Promise<void>> = [];

  if (user.avatarPath) {
    cleanupTasks.push(deleteAvatar(user.avatarPath));
  }

  cleanupTasks.push(
    deletePrivateDocuments(
      [
        user.academicIdPath,
        user.driverProfile?.licencePath,
        user.driverProfile?.insurancePath,
      ].filter((path): path is string => !!path),
    ),
  );

  const cleanupResults = await Promise.allSettled(cleanupTasks);
  for (const result of cleanupResults) {
    if (result.status === "rejected") {
      console.error("[users/deleteMyAccount] file cleanup failed", {
        userId: user.id,
        error: result.reason,
      });
    }
  }
}

async function cleanupClosedAccountAuth(userId: string): Promise<void> {
  try {
    const { error } = await deleteAuthUser(userId);
    if (error) {
      console.error("[users/deleteMyAccount] auth cleanup failed", {
        userId,
        error: error.message,
      });
    }
  } catch (error) {
    console.error("[users/deleteMyAccount] auth cleanup threw", {
      userId,
      error,
    });
  }
}

function serializeCurrentUser(user: CurrentUserRecord): MeResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    accountStatus: user.accountStatus,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    avatarPath: user.avatarPath ?? null,
    bio: user.bio ?? null,
    homeAddress: user.homeAddress ?? null,
    homeLat: user.homeLat ?? null,
    homeLng: user.homeLng ?? null,
    campusAddress: user.campusAddress ?? null,
    campusLat: user.campusLat ?? null,
    campusLng: user.campusLng ?? null,
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
    mustChangePassword: user.mustChangePassword,
    accountStatus: user.accountStatus,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    avatarPath: user.avatarPath ?? null,
    bio: user.bio ?? null,
    homeAddress: user.homeAddress ?? null,
    homeLat: user.homeLat ?? null,
    homeLng: user.homeLng ?? null,
    campusAddress: user.campusAddress ?? null,
    campusLat: user.campusLat ?? null,
    campusLng: user.campusLng ?? null,
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

function getUploadedFile(
  files: Request['files'],
  fieldName: string,
): Express.Multer.File | null {
  if (!files || Array.isArray(files)) {
    return null;
  }

  const fieldFiles = files[fieldName];
  if (!fieldFiles || fieldFiles.length === 0) {
    return null;
  }

  return fieldFiles[0] ?? null;
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
 * Updates user-editable profile fields.
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
 * DELETE /api/users/me
 *
 * Closes the current user's account while preserving historical records.
 */
export async function deleteMyAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.id) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    DeleteMyAccountSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    if (!user) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }

    if (user.role === "ADMIN") {
      throw new AppError(
        "FORBIDDEN",
        "Admin accounts cannot be deleted through self-service account closure",
        403,
      );
    }

    const [
      activeRidesCount,
      activeBookingsCount,
      pendingDriverApplicationsCount,
    ] = await Promise.all([
      prisma.ride.count({
        where: {
          driverId: user.id,
          status: { in: ["OPEN", "FULL", "IN_PROGRESS"] },
        },
      }),
      prisma.booking.count({
        where: {
          passengerId: user.id,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      }),
      prisma.driverProfile.count({
        where: {
          userId: user.id,
          status: "PENDING",
        },
      }),
    ]);

    if (activeRidesCount > 0) {
      throw new AppError(
        "ACCOUNT_DELETION_BLOCKED",
        "You cannot delete your account while you have active rides.",
        409,
      );
    }

    if (activeBookingsCount > 0) {
      throw new AppError(
        "ACCOUNT_DELETION_BLOCKED",
        "You cannot delete your account while you have active bookings.",
        409,
      );
    }

    if (pendingDriverApplicationsCount > 0) {
      throw new AppError(
        "ACCOUNT_DELETION_BLOCKED",
        "You cannot delete your account while your driver application is under review.",
        409,
      );
    }

    if (user.academicVerificationStatus === "PENDING") {
      throw new AppError(
        "ACCOUNT_DELETION_BLOCKED",
        "You cannot delete your account while your academic verification is under review.",
        409,
      );
    }

    const closedUser = await prisma.$transaction(async (tx) => {
      const txUntyped = tx as any;

      await txUntyped.user.update({
        where: { id: user.id },
        data: {
          accountStatus: "DEACTIVATED" as any,
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

      if (user.driverProfile) {
        await txUntyped.driverProfile.updateMany({
          where: { userId: user.id },
          data: {
            licencePath: null as any,
            insurancePath: null,
          },
        });
      }

      return user;
    });

    await Promise.all([
      cleanupClosedAccountAuth(closedUser.id),
      cleanupClosedAccountFiles(closedUser),
    ]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/me/driver
 * Uploads driver documents and creates or resubmits a pending driver application.
 */
export async function applyAsDriver(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const licenceFile = getUploadedFile(req.files, "licence");
    const insuranceFile = getUploadedFile(req.files, "insurance");

    if (!licenceFile) {
      throw new AppError("MISSING_FILE", "Licence file is required", 400);
    }

    if (!insuranceFile) {
      throw new AppError("MISSING_FILE", "Insurance file is required", 400);
    }

    const body: DriverApplicationInput = DriverApplicationSchema.parse(
      req.body,
    );

    const existingApplication = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (existingApplication?.status === "PENDING") {
      throw new AppError(
        "DRIVER_APPLICATION_PENDING",
        "Your driver application is already under review",
        409,
      );
    }

    if (existingApplication?.status === "APPROVED") {
      throw new AppError(
        "DRIVER_APPLICATION_APPROVED",
        "Your driver application has already been approved",
        409,
      );
    }

    const licencePath = await uploadLicense(
      req.user!.id,
      licenceFile.buffer,
      licenceFile.mimetype,
      licenceFile.originalname,
    );

    const insurancePath = await uploadInsurance(
      req.user!.id,
      insuranceFile.buffer,
      insuranceFile.mimetype,
      insuranceFile.originalname,
    );

    const driverProfile = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.user!.id },
        data: { role: "DRIVER" },
      });

      if (existingApplication?.status === "REJECTED") {
        return await (tx as any).driverProfile.update({
          where: { userId: req.user!.id },
          data: {
            licencePath,
            insurancePath,
            vehicleInfo: body.vehicle,
            status: "PENDING",
            rejectionReason: null,
          },
        });
      }

      return await (tx as any).driverProfile.create({
        data: {
          userId: req.user!.id,
          licencePath,
          insurancePath,
          vehicleInfo: body.vehicle,
          status: "PENDING",
          rejectionReason: null,
        },
      });
    });

    res.status(existingApplication?.status === "REJECTED" ? 200 : 201).json({
      data: driverProfile,
    });
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
      req.file.originalname,
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
    const user = await prisma.user.findUnique({
      where: { id },
      select: { accountStatus: true },
    });

    if ((user?.accountStatus as string | undefined) === "DEACTIVATED") {
      throw new AppError(
        "ACCOUNT_DEACTIVATED",
        "This account is no longer available.",
        410,
      );
    }

    const reviews = await prisma.review.findMany({
      where: { revieweeId: id },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarPath: true,
            accountStatus: true,
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
        reviewer: toAvatarPathSummary(review.reviewer),
      })),
    });
  } catch (err) {
    next(err);
  }
}

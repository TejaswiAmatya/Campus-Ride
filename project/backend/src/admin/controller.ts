import type { Request, Response, NextFunction } from "express";
import {
  CreateModerationActionSchema,
  DriverDecisionSchema,
  UpdateConfigSchema,
  ResolveReportSchema,
  CreateReportSchema,
} from "./schemas";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { emailQueue } from "../lib/emailQueue";
import { createSignedPrivateDocumentUrl } from "../lib/supabase";
import { validateReportTarget } from "../reports/validation";
import {
  getAdminConfigMap,
  getPublicConfigMap,
  upsertConfigValue,
} from "../config/service";
import { getStartOfWeek } from "../lib/date";

type VehicleInfo = {
  make: string;
  model: string;
  year: number;
  plateNumber: string;
};

const prismaUntyped = prisma as any;

type PendingDriverRecord = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  licencePath: string;
  insurancePath: string | null;
  vehicleInfo: unknown;
  createdAt: Date;
};

/**
 * GET /api/admin/stats
 *
 * Returns an overview for the admin dashboard:
 *   - Total users by role
 *   - Active rides count
 *   - Bookings today
 *   - Revenue today and all-time (sum of platformFee on COMPLETED bookings)
 *   - Pending driver applications count
 *   - Open reports count
 */
export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = getStartOfWeek(now);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeRides,
      bookingsToday,
      bookingsThisWeek,
      bookingsThisMonth,
      ridesCompleted,
      ridesCancelled,
      pendingDrivers,
      openReports,
      totalDrivers,
      totalPassengers,
      revenueResult,
      newUsersThisMonth,
    ] = await prisma.$transaction([
      prisma.ride.count({ where: { status: "IN_PROGRESS" } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.ride.count({ where: { status: "COMPLETED" } }),
      prisma.ride.count({ where: { status: "CANCELLED" } }),
      prisma.driverProfile.count({ where: { status: "PENDING" } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.driverProfile.count({ where: { status: "APPROVED" } }),
      prisma.user.count({ where: { role: "PASSENGER" } }),
      prisma.booking.aggregate({
        _sum: { platformFee: true },
        where: { status: "COMPLETED" },
      }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

    res.json({
      activeRides,
      bookingsToday,
      bookingsThisWeek,
      bookingsThisMonth,
      ridesCompleted,
      ridesCancelled,
      pendingDrivers,
      openReports,
      totalDrivers,
      totalPassengers,
      totalRevenue: revenueResult._sum?.platformFee ?? 0,
      newUsersThisMonth,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/drivers/pending
 *
 * Lists all pending driver applications,
 * including their uploaded licence URL and vehicle info.
 */
export async function listPendingDrivers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const drivers = await prismaUntyped.driverProfile.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const serializedDrivers = await Promise.all(
      drivers.map(async (driver: PendingDriverRecord) => ({
        id: driver.user.id,
        name: driver.user.name,
        email: driver.user.email,
        licenceUrl: await createSignedPrivateDocumentUrl(driver.licencePath),
        insuranceUrl: driver.insurancePath
          ? await createSignedPrivateDocumentUrl(driver.insurancePath)
          : null,
        vehicle: driver.vehicleInfo as VehicleInfo,
        createdAt: driver.createdAt,
      })),
    );

    res.json({
      data: serializedDrivers,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/verifications/academic/pending
 *
 * Lists all users with pending academic verification and signed document URLs.
 */
export async function listPendingAcademicVerifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await prismaUntyped.user.findMany({
      where: { academicVerificationStatus: "PENDING" },
      select: {
        id: true,
        name: true,
        email: true,
        academicRole: true,
        academicIdPath: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const serializedUsers = await Promise.all(
      users.map(async (user: {
        id: string;
        name: string;
        email: string;
        academicRole: "STUDENT" | "STAFF" | null;
        academicIdPath: string | null;
        createdAt: Date;
      }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        academicRole: user.academicRole,
        academicIdUrl: user.academicIdPath
          ? await createSignedPrivateDocumentUrl(user.academicIdPath)
          : null,
        createdAt: user.createdAt,
      })),
    );

    res.json({
      data: serializedUsers,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/drivers/:id/decision
 *
 * Approve or reject a driver application.
 * On approval: marks the driver profile APPROVED and promotes the user role to DRIVER.
 * On rejection: marks the driver profile REJECTED and reverts the user role to PASSENGER.
 */
export async function driverDecision(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const body = DriverDecisionSchema.parse(req.body);
    const existingDriver = await prisma.driverProfile.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: { id: true, role: true, name: true, email: true },
        },
      },
    });

    if (!existingDriver) {
      throw new AppError("NOT_FOUND", "Driver application not found", 404);
    }

    const updatedDriver = await prisma.$transaction(async (tx) => {
      const profile = await tx.driverProfile.update({
        where: { userId: id },
        data: {
          status: body.approved ? "APPROVED" : "REJECTED",
          approvedAt: body.approved ? new Date() : null,
        },
      });

      const user = await tx.user.update({
        where: { id },
        data: { role: body.approved ? "DRIVER" : "PASSENGER" },
        select: { id: true, name: true, email: true, role: true },
      });

      return { profile, user };
    });

    try {
      if (body.approved) {
        await emailQueue.driverApproved(
          updatedDriver.user.id,
          updatedDriver.user.email,
          updatedDriver.user.name,
        );
      } else {
        await emailQueue.driverRejected(
          updatedDriver.user.id,
          updatedDriver.user.email,
          updatedDriver.user.name,
          body.reason,
        );
      }
    } catch (queueErr) {
      console.error("[admin/driverDecision] driver decision queue failed", {
        driverId: updatedDriver.user.id,
        approved: body.approved,
        error: queueErr,
      });
    }

    res.json({
      data: {
        id: updatedDriver.user.id,
        name: updatedDriver.user.name,
        email: updatedDriver.user.email,
        role: updatedDriver.user.role,
        status: updatedDriver.profile.status,
        approvedAt: updatedDriver.profile.approvedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/reports
 *
 * Lists all filed reports, optionally filtered by status=OPEN|RESOLVED|DISMISSED.
 */
export async function listReports(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status } = req.query;

    const reports = await prisma.report.findMany({
      where: status ? { status: status as string } : undefined,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      data: reports.map((report) => ({
        id: report.id,
        reporter: report.reporter,
        targetUserId: report.targetUserId,
        targetRideId: report.targetRideId,
        targetUserRole: report.targetUserRole,
        reason: report.reason,
        status: report.status,
        note: report.note,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/reports/:id
 *
 * Returns one report plus lightweight target history needed by other tracks.
 */
export async function getReportDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const report = await prismaUntyped.report.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        moderationActions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!report) {
      throw new AppError("NOT_FOUND", "Report not found", 404);
    }

    const [targetUser, targetUserReviews, targetRide] = await Promise.all([
      prismaUntyped.user.findUnique({
        where: { id: report.targetUserId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountStatus: true,
          suspendedUntil: true,
          academicRole: true,
          academicVerificationStatus: true,
          academicIdPath: true,
          academicVerifiedAt: true,
          academicRejectionReason: true,
          createdAt: true,
        },
      }),
      prisma.review.findMany({
        where: { revieweeId: report.targetUserId },
        select: { rating: true },
      }),
      prisma.ride.findUnique({
        where: { id: report.targetRideId },
        select: {
          id: true,
          departureTime: true,
          originAddress: true,
          destinationAddress: true,
          status: true,
        },
      }),
    ]);

    const averageRating =
      targetUserReviews.length > 0
        ? targetUserReviews.reduce((sum, review) => sum + review.rating, 0) /
          targetUserReviews.length
        : null;

    res.json({
      data: {
        id: report.id,
        reporter: report.reporter,
        targetUser,
        targetRide,
        targetUserRole: report.targetUserRole,
        reason: report.reason,
        status: report.status,
        note: report.note,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        targetUserRatings: {
          average: averageRating,
          count: targetUserReviews.length,
        },
        moderationActions: report.moderationActions,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/reports/:id
 *
 * Admin resolves or dismisses a report.
 */
export async function resolveReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const body = ResolveReportSchema.parse(req.body);

    const report = await prisma.report.update({
      where: { id },
      data: {
        status: body.resolution,
        note: body.note,
      },
    });

    res.json({ data: report });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/users/:id/moderation-actions
 *
 * Creates an audit record and applies a basic account-state stub.
 */
export async function createModerationAction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const { id: targetUserId } = req.params;
    const body = CreateModerationActionSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!targetUser) {
      throw new AppError("NOT_FOUND", "Target user not found", 404);
    }

    const accountState =
      body.actionType === "WARNING"
        ? { accountStatus: "WARNED" as const, suspendedUntil: null }
        : body.actionType === "SUSPENSION"
          ? {
              accountStatus: "SUSPENDED" as const,
              suspendedUntil: body.suspendedUntil
                ? new Date(body.suspendedUntil)
                : null,
            }
          : body.actionType === "BAN"
            ? { accountStatus: "BANNED" as const, suspendedUntil: null }
            : { accountStatus: "ACTIVE" as const, suspendedUntil: null };

    const result = await prisma.$transaction(async (tx) => {
      const action = await (tx as any).moderationAction.create({
        data: {
          adminId,
          targetUserId,
          reportId: body.reportId,
          actionType: body.actionType,
          reason: body.reason,
          note: body.note,
          expiresAt: body.suspendedUntil ? new Date(body.suspendedUntil) : null,
        },
      });

      const user = await (tx as any).user.update({
        where: { id: targetUserId },
        data: accountState as any,
        select: {
          id: true,
          accountStatus: true,
          suspendedUntil: true,
        },
      });

      return { action, user };
    });

    res.status(201).json({
      data: {
        action: result.action,
        user: result.user,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/config
 *
 * Public endpoint — returns platform configuration values visible to clients
 * (e.g. platformFeePercent, allowedEmailDomains).
 */
export async function getConfig(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const config = await getPublicConfigMap();
    res.json({ data: config });
  } catch (err) {
    next(err);
  }
}

export async function getAdminConfig(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const config = await getAdminConfigMap();
    res.json({ data: config });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/config
 *
 * Admin updates a config value (e.g. sets platformFeePercent to 12).
 */
export async function updateConfig(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = UpdateConfigSchema.parse(req.body);
    const config = await upsertConfigValue(body.key, body.value);
    res.json({ data: config });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reports
 *
 * Any authenticated user can file a report against a user or a ride.
 */
export async function createReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.id) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const body = CreateReportSchema.parse(req.body);
    const targetUser = await validateReportTarget(
      req.user.id,
      body.targetUserId,
      body.targetRideId,
    );

    const report = await prisma.report.create({
      data: {
        reporterId: req.user.id,
        targetUserId: body.targetUserId,
        targetRideId: body.targetRideId,
        targetUserRole: targetUser.role,
        reason: body.reason,
      },
    });

    res.status(201).json({ data: report });
  } catch (err) {
    next(err);
  }
}

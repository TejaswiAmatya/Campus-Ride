import type { Request, Response, NextFunction } from "express";
import {
  AcademicDecisionSchema,
  CreateModerationActionSchema,
  MarkAnnouncementReadSchema,
  DriverDecisionSchema,
  SendAnnouncementSchema,
  UpdateConfigSchema,
  ResolveReportSchema,
  CreateReportSchema,
} from "./schemas";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { emailQueue } from "../lib/emailQueue";
import { notify } from "../lib/notify";
import { createSignedPrivateDocumentUrl, supabaseAdmin } from "../lib/supabase";
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

type GrowthBucket = {
  periodStart: Date;
  periodEnd: Date;
};

type UserGrowthPoint = {
  periodStart: string;
  periodEnd: string;
  driverCount: number;
  passengerCount: number;
  totalNewUsers: number;
  cumulativeTotalUsers: number;
  deactivatedOrBannedUsers: number;
  netGrowth: number;
};

function getDailyBuckets(now: Date, days = 30): GrowthBucket[] {
  const buckets: GrowthBucket[] = [];
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  for (let index = days - 1; index >= 0; index -= 1) {
    const periodStart = new Date(todayStart);
    periodStart.setDate(periodStart.getDate() - index);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 1);
    buckets.push({ periodStart, periodEnd });
  }

  return buckets;
}

function getWeeklyBuckets(now: Date, weeks = 12): GrowthBucket[] {
  const buckets: GrowthBucket[] = [];
  const currentWeekStart = getStartOfWeek(now);

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const periodStart = new Date(currentWeekStart);
    periodStart.setDate(periodStart.getDate() - index * 7);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 7);
    buckets.push({ periodStart, periodEnd });
  }

  return buckets;
}

function getMonthlyBuckets(now: Date, months = 12): GrowthBucket[] {
  const buckets: GrowthBucket[] = [];
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  for (let index = months - 1; index >= 0; index -= 1) {
    const periodStart = new Date(
      currentMonthStart.getFullYear(),
      currentMonthStart.getMonth() - index,
      1,
    );
    const periodEnd = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth() + 1,
      1,
    );
    buckets.push({ periodStart, periodEnd });
  }

  return buckets;
}

function buildGrowthSeries(
  buckets: GrowthBucket[],
  users: Array<{
    role: string;
    createdAt: Date;
  }>,
  deactivationEvents: Array<{ updatedAt: Date }>,
  initialTotal: number,
): UserGrowthPoint[] {
  const points: UserGrowthPoint[] = [];
  let runningTotal = initialTotal;

  for (const bucket of buckets) {
    const newUsers = users.filter(
      (user) =>
        user.createdAt >= bucket.periodStart && user.createdAt < bucket.periodEnd,
    );
    const driverCount = newUsers.filter((user) => user.role === "DRIVER").length;
    const passengerCount = newUsers.filter(
      (user) => user.role === "PASSENGER",
    ).length;
    const totalNewUsers = driverCount + passengerCount;
    runningTotal += totalNewUsers;

    const deactivatedOrBannedUsers = deactivationEvents.filter(
      (event) =>
        event.updatedAt >= bucket.periodStart && event.updatedAt < bucket.periodEnd,
    ).length;

    points.push({
      periodStart: bucket.periodStart.toISOString(),
      periodEnd: bucket.periodEnd.toISOString(),
      driverCount,
      passengerCount,
      totalNewUsers,
      cumulativeTotalUsers: runningTotal,
      deactivatedOrBannedUsers,
      netGrowth: totalNewUsers - deactivatedOrBannedUsers,
    });
  }

  return points;
}

type PendingDriverRecord = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  licencePath: string | null;
  insurancePath: string | null;
  vehicleInfo: unknown;
  createdAt: Date;
};

const PLATFORM_HEALTH_SIGNAL_ORDER = [
  "High Cancellation Rate",
  "Multiple Reports Received",
  "Low Average Rating",
  "No-Show Pattern",
  "New Account Activity Spike",
] as const;

type PlatformHealthSignalLabel =
  (typeof PLATFORM_HEALTH_SIGNAL_ORDER)[number];

const PLATFORM_HEALTH_SIGNAL_WEIGHTS: Record<
  PlatformHealthSignalLabel,
  number
> = {
  "High Cancellation Rate": 30,
  "Multiple Reports Received": 30,
  "Low Average Rating": 20,
  "No-Show Pattern": 15,
  "New Account Activity Spike": 5,
};

type PlatformHealthUserSummary = {
  id: string;
  name: string;
  email: string;
  role: "PASSENGER" | "DRIVER" | "ADMIN";
  createdAt: Date;
};

type PlatformHealthEntry = {
  userId: string;
  reasons: Set<PlatformHealthSignalLabel>;
  score: number;
  cancellationRate: number | null;
  reportsReceived: number | null;
  avgRating: number | null;
  noShowCount: number | null;
};

type PlatformHealthResponseItem = {
  user: PlatformHealthUserSummary;
  reasons: PlatformHealthSignalLabel[];
  score: number;
  cancellationRate: number | null;
  reportsReceived: number | null;
  avgRating: number | null;
  noShowCount: number | null;
};

type AnnouncementResponse = {
  id: string;
  subject: string;
  message: string;
  createdAt: string;
};

function serializeAnnouncement(announcement: {
  id: string;
  subject: string;
  message: string;
  createdAt: Date;
}): AnnouncementResponse {
  return {
    id: announcement.id,
    subject: announcement.subject,
    message: announcement.message,
    createdAt: announcement.createdAt.toISOString(),
  };
}

function getPlatformHealthEntry(
  userEntries: Map<string, PlatformHealthEntry>,
  userId: string,
): PlatformHealthEntry {
  const existingEntry = userEntries.get(userId);
  if (existingEntry) {
    return existingEntry;
  }

  const nextEntry: PlatformHealthEntry = {
    userId,
    reasons: new Set<PlatformHealthSignalLabel>(),
    score: 0,
    cancellationRate: null,
    reportsReceived: null,
    avgRating: null,
    noShowCount: null,
  };
  userEntries.set(userId, nextEntry);
  return nextEntry;
}

function applyPlatformHealthSignal(
  userEntries: Map<string, PlatformHealthEntry>,
  userId: string,
  signal: PlatformHealthSignalLabel,
  stats?: Partial<
    Pick<
      PlatformHealthEntry,
      "cancellationRate" | "reportsReceived" | "avgRating" | "noShowCount"
    >
  >,
): void {
  const entry = getPlatformHealthEntry(userEntries, userId);

  if (!entry.reasons.has(signal)) {
    entry.reasons.add(signal);
    entry.score = Math.min(
      100,
      entry.score + PLATFORM_HEALTH_SIGNAL_WEIGHTS[signal],
    );
  }

  if (stats?.cancellationRate !== undefined) {
    entry.cancellationRate = stats.cancellationRate;
  }
  if (stats?.reportsReceived !== undefined) {
    entry.reportsReceived = stats.reportsReceived;
  }
  if (stats?.avgRating !== undefined) {
    entry.avgRating = stats.avgRating;
  }
  if (stats?.noShowCount !== undefined) {
    entry.noShowCount = stats.noShowCount;
  }
}

/**
 * GET /api/admin/health
 *
 * Returns suspicious users ranked by weighted platform health signals.
 */
export async function getPlatformHealth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const now = new Date();
    const staleRideThreshold = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const recentAccountThreshold = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    );

    const [
      bookingsByPassenger,
      reportsByTargetUser,
      reviewsByReviewee,
      staleRidesByDriver,
      recentUsers,
    ] = await Promise.all([
      prisma.booking.findMany({
        select: {
          passengerId: true,
          status: true,
        },
      }),
      prisma.report.groupBy({
        by: ["targetUserId"],
        _count: { _all: true },
      }),
      prisma.review.groupBy({
        by: ["revieweeId"],
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.ride.groupBy({
        by: ["driverId"],
        where: {
          status: "IN_PROGRESS",
          updatedAt: { lt: staleRideThreshold },
        },
        _count: { _all: true },
      }),
      prisma.user.findMany({
        where: {
          createdAt: { gte: recentAccountThreshold },
        },
        select: {
          id: true,
          createdAt: true,
          bookings: {
            select: {
              status: true,
            },
          },
        },
      }),
    ]);

    const suspiciousUsersById = new Map<string, PlatformHealthEntry>();

    const bookingStatsByPassengerId = new Map<
      string,
      { total: number; cancelled: number }
    >();

    for (const booking of bookingsByPassenger) {
      const bookingStats = bookingStatsByPassengerId.get(booking.passengerId) ?? {
        total: 0,
        cancelled: 0,
      };

      bookingStats.total += 1;
      if (booking.status === "CANCELLED") {
        bookingStats.cancelled += 1;
      }

      bookingStatsByPassengerId.set(booking.passengerId, bookingStats);
    }

    for (const [passengerId, bookingStats] of bookingStatsByPassengerId) {
      if (bookingStats.total < 5) {
        continue;
      }

      const cancellationRate = bookingStats.cancelled / bookingStats.total;
      if (cancellationRate >= 0.4) {
        applyPlatformHealthSignal(
          suspiciousUsersById,
          passengerId,
          "High Cancellation Rate",
          { cancellationRate },
        );
      }
    }

    for (const reportSummary of reportsByTargetUser) {
      if (reportSummary._count._all >= 2) {
        applyPlatformHealthSignal(
          suspiciousUsersById,
          reportSummary.targetUserId,
          "Multiple Reports Received",
          { reportsReceived: reportSummary._count._all },
        );
      }
    }

    for (const reviewSummary of reviewsByReviewee) {
      const averageRating = reviewSummary._avg.rating;
      if (reviewSummary._count._all >= 3 && averageRating !== null && averageRating <= 2.5) {
        applyPlatformHealthSignal(
          suspiciousUsersById,
          reviewSummary.revieweeId,
          "Low Average Rating",
          { avgRating: averageRating },
        );
      }
    }

    for (const staleRideSummary of staleRidesByDriver) {
      if (staleRideSummary._count._all >= 2) {
        applyPlatformHealthSignal(
          suspiciousUsersById,
          staleRideSummary.driverId,
          "No-Show Pattern",
          { noShowCount: staleRideSummary._count._all },
        );
      }
    }

    for (const user of recentUsers) {
      const accountAgeMs = now.getTime() - user.createdAt.getTime();
      if (accountAgeMs >= 7 * 24 * 60 * 60 * 1000) {
        continue;
      }

      const totalBookings = user.bookings.length;
      const cancellationCount = user.bookings.filter(
        (booking) => booking.status === "CANCELLED",
      ).length;

      if (totalBookings > 5 || cancellationCount > 2) {
        applyPlatformHealthSignal(
          suspiciousUsersById,
          user.id,
          "New Account Activity Spike",
        );
      }
    }

    const suspiciousUserIds = Array.from(suspiciousUsersById.keys());
    if (suspiciousUserIds.length === 0) {
      res.json({ data: [] satisfies PlatformHealthResponseItem[] });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: suspiciousUserIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const usersById = new Map(users.map((user) => [user.id, user]));

    const rankedUsers: PlatformHealthResponseItem[] = suspiciousUserIds
      .map((userId) => {
        const user = usersById.get(userId);
        const entry = suspiciousUsersById.get(userId);

        if (!user || !entry) {
          return null;
        }

        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
          },
          reasons: PLATFORM_HEALTH_SIGNAL_ORDER.filter((signal) =>
            entry.reasons.has(signal),
          ),
          score: entry.score,
          cancellationRate: entry.cancellationRate,
          reportsReceived: entry.reportsReceived,
          avgRating: entry.avgRating,
          noShowCount: entry.noShowCount,
        };
      })
      .filter(
        (entry): entry is PlatformHealthResponseItem => entry !== null,
      )
      .sort((left, right) => right.score - left.score);

    res.json({ data: rankedUsers });
  } catch (err) {
    next(err);
  }
}

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
 * GET /api/admin/analytics/user-growth
 *
 * Returns daily (30d), weekly (12w), and monthly (12m) user growth analytics
 * with role split, cumulative totals, and net growth.
 */
export async function getUserGrowthAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const now = new Date();
    const dailyBuckets = getDailyBuckets(now, 30);
    const weeklyBuckets = getWeeklyBuckets(now, 12);
    const monthlyBuckets = getMonthlyBuckets(now, 12);

    const oldestBoundary = monthlyBuckets[0]?.periodStart ?? new Date(now);

    const [
      usersInRange,
      baselineTotalUsers,
      deactivationEventsInRange,
      currentDrivers,
      currentPassengers,
    ] = await prisma.$transaction([
      prisma.user.findMany({
        where: {
          createdAt: { gte: oldestBoundary },
          role: { in: ["DRIVER", "PASSENGER"] },
        },
        select: { role: true, createdAt: true },
      }),
      prisma.user.count({
        where: {
          createdAt: { lt: oldestBoundary },
          role: { in: ["DRIVER", "PASSENGER"] },
        },
      }),
      prisma.user.findMany({
        where: {
          updatedAt: { gte: oldestBoundary },
          accountStatus: { in: ["SUSPENDED", "BANNED"] },
        },
        select: { updatedAt: true },
      }),
      prisma.user.count({ where: { role: "DRIVER" } }),
      prisma.user.count({ where: { role: "PASSENGER" } }),
    ]);

    const daily = buildGrowthSeries(
      dailyBuckets,
      usersInRange,
      deactivationEventsInRange,
      baselineTotalUsers,
    );
    const weekly = buildGrowthSeries(
      weeklyBuckets,
      usersInRange,
      deactivationEventsInRange,
      baselineTotalUsers,
    );
    const monthly = buildGrowthSeries(
      monthlyBuckets,
      usersInRange,
      deactivationEventsInRange,
      baselineTotalUsers,
    );

    res.json({
      daily,
      weekly,
      monthly,
      totals: {
        drivers: currentDrivers,
        passengers: currentPassengers,
        users: currentDrivers + currentPassengers,
      },
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
        licenceUrl: driver.licencePath
          ? await createSignedPrivateDocumentUrl(driver.licencePath)
          : null,
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
 * PATCH /api/admin/verifications/academic/:userId
 *
 * Approve or reject an academic verification submission.
 */
export async function academicDecision(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params;
    const body = AcademicDecisionSchema.parse(req.body);

    const existingUser = await prismaUntyped.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        academicVerificationStatus: true,
      },
    });

    if (!existingUser) {
      throw new AppError("NOT_FOUND", "Academic verification not found", 404);
    }

    const user = await prismaUntyped.user.update({
      where: { id: userId },
      data: {
        academicVerificationStatus: body.approved ? "VERIFIED" : "REJECTED",
        academicVerifiedAt: body.approved ? new Date() : null,
        academicRejectionReason: body.approved ? null : body.reason,
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

    res.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        academicRole: user.academicRole,
        academicVerificationStatus: user.academicVerificationStatus,
        academicVerifiedAt: user.academicVerifiedAt,
        academicRejectionReason: user.academicRejectionReason,
      },
    });

    try {
      if (body.approved) {
        await emailQueue.academicApproved(user.id, user.email, user.name);
      } else {
        await emailQueue.academicRejected(
          user.id,
          user.email,
          user.name,
          body.reason,
        );
      }
    } catch (queueErr) {
      console.error("[admin/academicDecision] academic decision queue failed", {
        userId: user.id,
        approved: body.approved,
        error: queueErr,
      });
    }
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

    // tx means transaction which maintains atomicity of the operation
    const updatedDriver = await prisma.$transaction(async (tx) => {
      const profile = await tx.driverProfile.update({
        where: { userId: id },
        data: {
          status: body.approved ? "APPROVED" : "REJECTED",
          approvedAt: body.approved ? new Date() : null,
          rejectionReason: body.approved ? null : body.reason,
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
        reason: updatedDriver.profile.rejectionReason ?? null,
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

    const targetUserIds = Array.from(
      new Set(reports.map((report) => report.targetUserId)),
    );

    const [targetUsers, targetUserReviews, completedRides, targetUserReports] =
      await Promise.all([
        prisma.user.findMany({
          where: { id: { in: targetUserIds } },
          select: { id: true, name: true },
        }),
        prisma.review.groupBy({
          by: ["revieweeId"],
          where: { revieweeId: { in: targetUserIds } },
          _avg: { rating: true },
        }),
        prisma.ride.groupBy({
          by: ["driverId"],
          where: {
            driverId: { in: targetUserIds },
            status: "COMPLETED",
          },
          _count: { _all: true },
        }),
        prisma.report.findMany({
          where: { targetUserId: { in: targetUserIds } },
          select: { id: true, targetUserId: true, createdAt: true },
          orderBy: [{ targetUserId: "asc" }, { createdAt: "asc" }],
        }),
      ]);

    const targetUserNameById = new Map(
      targetUsers.map((user) => [user.id, user.name]),
    );
    const averageRatingByUserId = new Map(
      targetUserReviews.map((review) => [
        review.revieweeId,
        review._avg.rating ?? null,
      ]),
    );
    const completedRideCountByUserId = new Map(
      completedRides.map((ride) => [ride.driverId, ride._count._all]),
    );

    const previousReportCountByReportId = new Map<string, number>();
    const processedReportCountsByUserId = new Map<string, number>();

    for (const targetReport of targetUserReports) {
      const previousCount =
        processedReportCountsByUserId.get(targetReport.targetUserId) ?? 0;
      previousReportCountByReportId.set(targetReport.id, previousCount);
      processedReportCountsByUserId.set(
        targetReport.targetUserId,
        previousCount + 1,
      );
    }

    res.json({
      data: reports.map((report) => ({
        id: report.id,
        reporter: report.reporter,
        targetUserId: report.targetUserId,
        targetRideId: report.targetRideId,
        targetUserSummary: {
          name: targetUserNameById.get(report.targetUserId) ?? null,
          rideCount: completedRideCountByUserId.get(report.targetUserId) ?? 0,
          rating: averageRatingByUserId.get(report.targetUserId) ?? null,
          reportCount:
            previousReportCountByReportId.get(report.id) ?? 0,
        },
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
      select: { id: true, name: true, email: true },
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

      if (body.reportId) {
        await (tx as any).report.update({
          where: { id: body.reportId },
          data: { status: "RESOLVED" },
        });
      }

      return { action, user };
    });

    if (
      body.actionType === "WARNING" ||
      body.actionType === "SUSPENSION" ||
      body.actionType === "BAN"
    ) {
      const updatedAt = new Date();

      try {
        await notify.moderationAction(targetUserId, {
          actionType: body.actionType,
          reason: body.reason,
          note: body.note,
          suspendedUntil:
            body.actionType === "SUSPENSION" ? body.suspendedUntil ?? null : null,
          updatedAt: updatedAt.toISOString(),
        });
      } catch (socketErr) {
        console.error("[admin/createModerationAction] moderation socket failed", {
          targetUserId,
          actionType: body.actionType,
          error: socketErr,
        });
      }

      try {
        await emailQueue.moderationAction(
          targetUserId,
          targetUser.email,
          targetUser.name,
          body.actionType,
          body.reason,
          body.note,
          body.actionType === "SUSPENSION" ? body.suspendedUntil ?? null : null,
        );
      } catch (queueErr) {
        console.error("[admin/createModerationAction] moderation queue failed", {
          targetUserId,
          actionType: body.actionType,
          error: queueErr,
        });
      }
    }

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

export async function sendAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const body = SendAnnouncementSchema.parse(req.body);
    const announcement = await prisma.announcement.create({
      data: {
        subject: body.subject,
        message: body.message,
        createdById: adminId,
      },
      select: {
        id: true,
        subject: true,
        message: true,
        createdAt: true,
      },
    });

    const payload = serializeAnnouncement(announcement);

    try {
      await notify.announcement(payload);
    } catch (socketErr) {
      console.error("[admin/sendAnnouncement] announcement socket failed", {
        announcementId: announcement.id,
        error: socketErr,
      });
    }

    res.status(201).json({ data: payload });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadAnnouncements(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const announcements = await prisma.announcement.findMany({
      where: {
        reads: {
          none: {
            userId,
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

    res.json({ data: announcements.map(serializeAnnouncement) });
  } catch (err) {
    next(err);
  }
}

export async function markAnnouncementRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const body = MarkAnnouncementReadSchema.parse({
      announcementId: req.params.id ?? req.body?.announcementId,
    });

    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: body.announcementId,
          userId,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        announcementId: body.announcementId,
        userId,
      },
    });

    res.status(204).send();
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
 * PATCH /api/admin/change-password
 *
 * Allows authenticated admins to change their own password and clear
 * the must-change-password flag after a successful update.
 */
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
    }

    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword || newPassword.length < 8) {
      throw new AppError("WEAK_PASSWORD", "Minimum 8 characters", 400);
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(adminId, {
      password: newPassword,
    });

    if (error) {
      throw new AppError(
        "AUTH_PROVIDER_ERROR",
        error.message || "Unable to update password",
        502,
      );
    }

    await prismaUntyped.user.update({
      where: { id: adminId },
      data: { mustChangePassword: false },
    });

    res.json({ message: "Password updated successfully" });
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

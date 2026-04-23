import type { Request, Response, NextFunction } from "express";
import {
  DriverDecisionSchema,
  UpdateConfigSchema,
  ResolveReportSchema,
  CreateReportSchema,
} from "./schemas";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { emailQueue } from "../lib/emailQueue";

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

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

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
      prisma.user.count({
        where: { role: "DRIVER", isDriverApproved: false },
      }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.user.count({
        where: { role: "DRIVER", isDriverApproved: true },
      }),
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
 * Lists all users with role=DRIVER and isDriverApproved=false,
 * including their uploaded licence URL and vehicle info.
 */
export async function listPendingDrivers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: "DRIVER", isDriverApproved: false },
      include: { vehicle: true },
      orderBy: { createdAt: "asc" },
    });

    res.json({ data: drivers });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/drivers/:id/decision
 *
 * Approve or reject a driver application.
 * On approval: sets isDriverApproved = true, enqueues driver-approved email.
 * On rejection: sets role = PASSENGER (reverts), enqueues rejection email with reason.
 */
export async function driverDecision(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const body = DriverDecisionSchema.parse(req.body);
    const existingDriver = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isDriverApproved: true },
    });

    if (!existingDriver || existingDriver.role !== "DRIVER") {
      throw new AppError("NOT_FOUND", "Driver application not found", 404);
    }

    const updatedDriver = await prisma.user.update({
      where: { id },
      data: {
        isDriverApproved: body.approved,
        ...(body.approved ? {} : { role: "PASSENGER" }),
      },
      include: { vehicle: true },
    });

    //sending email
    if (body.approved) {
      await emailQueue.driverApproved(
        updatedDriver.id,
        updatedDriver.email,
        updatedDriver.name,
      );
    } else {
      await emailQueue.driverRejected(
        updatedDriver.id,
        updatedDriver.email,
        updatedDriver.name,
      );
    }
    res.json({ data: updatedDriver });
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

    // TODO:
    // const reports = await prisma.report.findMany({
    //   where: status ? { status: status as string } : undefined,
    //   include: {
    //     reporter: { select: { id: true, name: true, email: true } },
    //   },
    //   orderBy: { createdAt: 'desc' },
    // })
    // res.json({ data: reports })

    res.json({ message: "TODO: list reports", filter: { status } });
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

    // TODO: prisma.report.update({ where: { id }, data: { status: body.resolution } })

    res.json({
      message: "TODO: resolve report",
      reportId: id,
      resolution: body.resolution,
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
    // TODO:
    // const configs = await prisma.config.findMany()
    // const map = Object.fromEntries(configs.map((c) => [c.key, c.value]))
    // res.json({ data: map })

    res.json({ message: "TODO: get config" });
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

    // TODO:
    // const config = await prisma.config.upsert({
    //   where: { key: body.key },
    //   create: { key: body.key, value: body.value },
    //   update: { value: body.value },
    // })
    // res.json({ data: config })

    res.json({
      message: "TODO: update config",
      key: body.key,
      value: body.value,
    });
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
    const body = CreateReportSchema.parse(req.body);

    // TODO:
    // const report = await prisma.report.create({
    //   data: { ...body, reporterId: req.user!.id },
    // })
    // res.status(201).json({ data: report })

    res.status(201).json({ message: "TODO: create report", body });
  } catch (err) {
    next(err);
  }
}

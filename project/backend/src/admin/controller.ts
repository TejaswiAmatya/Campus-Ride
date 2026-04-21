import type { Request, Response, NextFunction } from "express";
import {
  DriverDecisionSchema,
  UpdateConfigSchema,
  ResolveReportSchema,
  CreateReportSchema,
} from "./schemas";
import { prisma } from "../lib/prisma";

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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [activeRides, bookingsToday, revenueResult] =
      await prisma.$transaction([
        prisma.ride.count({ where: { status: "IN_PROGRESS" } }),
        prisma.booking.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.booking.aggregate({
          _sum: { price: true },
          where: { status: "CONFIRMED" },
        }),
      ]);
    res.json({
      activeRides,
      bookingsToday,
      totalRevenue: revenueResult._sum.price ?? 0,
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
    // TODO:
    // const drivers = await prisma.user.findMany({
    //   where: { role: 'DRIVER', isDriverApproved: false },
    //   include: { vehicle: true },
    //   orderBy: { createdAt: 'asc' },
    // })
    // res.json({ data: drivers })

    res.json({ message: "TODO: list pending drivers" });
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

    // TODO:
    // if (body.approved) {
    //   await prisma.user.update({ where: { id }, data: { isDriverApproved: true } })
    //   await emailQueue.add('driver-approved', { recipientEmail: driver.email, payload: {} })
    // } else {
    //   await prisma.user.update({ where: { id }, data: { role: 'PASSENGER', isDriverApproved: false } })
    //   await emailQueue.add('driver-rejected', { recipientEmail: driver.email, payload: { reason: body.reason } })
    // }

    res.json({
      message: `TODO: ${body.approved ? "approve" : "reject"} driver`,
      driverId: id,
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

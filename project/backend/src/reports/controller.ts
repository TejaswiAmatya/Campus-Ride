import type { Request, Response, NextFunction } from "express";

import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { CreateReportSchema } from "../admin/schemas";

export async function createReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const body = CreateReportSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id: body.targetUserId },
    });

    if (!targetUser) {
      throw new AppError("NOT_FOUND", "Target user not found", 404);
    }

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

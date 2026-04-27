import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as controller from "./controller";

export const adminRouter = Router();

adminRouter.post("/reports", requireAuth, controller.createReport);
adminRouter.get(
  "/announcements/unread",
  requireAuth,
  controller.getUnreadAnnouncements,
);
adminRouter.post(
  "/announcements/:id/read",
  requireAuth,
  controller.markAnnouncementRead,
);

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.post("/announcements", controller.sendAnnouncement);
adminRouter.get("/health", controller.getPlatformHealth);
adminRouter.get("/stats", controller.getStats);
adminRouter.get("/analytics/user-growth", controller.getUserGrowthAnalytics);
adminRouter.get("/drivers/pending", controller.listPendingDrivers);
adminRouter.get(
  "/verifications/academic/pending",
  controller.listPendingAcademicVerifications,
);
adminRouter.patch(
  "/verifications/academic/:userId",
  controller.academicDecision,
);
adminRouter.patch("/drivers/:id/decision", controller.driverDecision);
adminRouter.get("/reports", controller.listReports);
adminRouter.get("/reports/:id", controller.getReportDetail);
adminRouter.patch("/reports/:id", controller.resolveReport);
adminRouter.post("/users/:id/moderation-actions", controller.createModerationAction);
adminRouter.patch("/change-password", controller.changePassword);
adminRouter.get("/config", controller.getAdminConfig);
adminRouter.patch("/config", controller.updateConfig);

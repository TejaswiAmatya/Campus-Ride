import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as controller from "./controller";

export const adminRouter = Router();

adminRouter.post("/reports", requireAuth, controller.createReport);

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/stats", controller.getStats);
adminRouter.get("/drivers/pending", controller.listPendingDrivers);
adminRouter.patch("/drivers/:id/decision", controller.driverDecision);
adminRouter.get("/reports", controller.listReports);
adminRouter.get("/reports/:id", controller.getReportDetail);
adminRouter.patch("/reports/:id", controller.resolveReport);
adminRouter.post("/users/:id/moderation-actions", controller.createModerationAction);
adminRouter.get("/config", controller.getAdminConfig);
adminRouter.patch("/config", controller.updateConfig);

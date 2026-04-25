import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as controller from "./controller";

export const ridesRouter = Router();

ridesRouter.get("/", controller.searchRides);
ridesRouter.get("/mine", requireAuth, controller.getMyRides); // must come before /:id
ridesRouter.post("/:rideId/reviews", requireAuth, controller.createReview);
ridesRouter.get("/:id", controller.getRide);

ridesRouter.post("/", requireAuth, requireRole("DRIVER"), controller.createRide);
ridesRouter.patch("/:id/status", requireAuth, requireRole("DRIVER"), controller.updateRideStatus);
ridesRouter.delete("/:id", requireAuth, requireRole("DRIVER"), controller.cancelRide);

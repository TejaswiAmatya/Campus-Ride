import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as controller from "./controller";

export const reportRouter = Router();

// All report routes require authentication
reportRouter.use(requireAuth);

reportRouter.post("/", controller.createReport);

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getChatHistory } from "./controller";

const router = Router();

router.get("/rides/:rideId/messages", requireAuth, getChatHistory);

export default router;

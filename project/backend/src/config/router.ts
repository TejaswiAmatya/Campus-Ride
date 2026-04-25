import { Router } from "express";
import { getConfig } from "../admin/controller";

export const configRouter = Router();

configRouter.get("/", getConfig);

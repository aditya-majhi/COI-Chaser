import { Router } from "express";
import { getHealth, getSession } from "../controllers/health.js";
import { requireAuth } from "../middleware/auth.js";

export const healthRouter = Router();

healthRouter.get("/health", getHealth);
healthRouter.get("/session", requireAuth, getSession);

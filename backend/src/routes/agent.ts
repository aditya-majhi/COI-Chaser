import { Router } from "express";
import { resolveCaseController } from "../controllers/agent.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const agentRouter = Router();
agentRouter.use(requireAuth, requireOrganization);
agentRouter.post("/:id/resolve", resolveCaseController);

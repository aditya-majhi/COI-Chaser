import { Router } from "express";
import { createOrganizationController } from "../controllers/organizations.js";
import { requireAuth } from "../middleware/auth.js";

export const organizationRouter = Router();
organizationRouter.use(requireAuth);
organizationRouter.post("/", createOrganizationController);

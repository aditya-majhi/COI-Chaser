import { Router } from "express";
import { recheckComplianceController } from "../controllers/compliance.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const complianceRouter = Router();
complianceRouter.use(requireAuth, requireOrganization);
complianceRouter.post("/:id/recheck", recheckComplianceController);

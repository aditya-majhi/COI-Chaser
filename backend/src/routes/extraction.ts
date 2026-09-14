import { Router } from "express";
import { extractDocumentController } from "../controllers/extraction.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const extractionRouter = Router();
extractionRouter.use(requireAuth, requireOrganization);
extractionRouter.post(
  "/:caseId/documents/:documentId/extract",
  extractDocumentController
);

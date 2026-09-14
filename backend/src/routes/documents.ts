import { Router } from "express";
import multer from "multer";
import { uploadDocumentController } from "../controllers/documents.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export const documentRouter = Router();
documentRouter.use(requireAuth, requireOrganization);
documentRouter.post(
  "/:id/documents",
  upload.single("file"),
  uploadDocumentController
);

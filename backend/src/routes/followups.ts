import { Router } from "express";
import { processFollowupsController } from "../controllers/followups.js";
import { requireInternalSecret } from "../middleware/internal.js";

export const followupRouter = Router();
followupRouter.post(
  "/internal/followups/run",
  requireInternalSecret,
  processFollowupsController
);

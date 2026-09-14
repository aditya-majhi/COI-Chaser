import { Router } from "express";
import { humanReviewController } from "../controllers/human-review.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const humanReviewRouter = Router();
humanReviewRouter.use(requireAuth, requireOrganization);
humanReviewRouter.post("/:id/human-review", humanReviewController);

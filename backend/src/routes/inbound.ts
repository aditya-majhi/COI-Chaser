import { Router } from "express";
import { inboundEmailController } from "../controllers/inbound.js";
import { requireInternalSecret } from "../middleware/internal.js";

export const inboundRouter = Router();
inboundRouter.post(
  "/inbound/email",
  requireInternalSecret,
  inboundEmailController
);

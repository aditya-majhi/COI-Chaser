import { Router } from "express";
import {
  getCaseController,
  listCaseEventsController,
  transitionCaseController,
} from "../controllers/cases.js";
import { requestCaseController } from "../controllers/requests.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const caseRouter = Router();
caseRouter.use(requireAuth, requireOrganization);
caseRouter.get("/:id", getCaseController);
caseRouter.post("/:id/transition", transitionCaseController);
caseRouter.get("/:id/events", listCaseEventsController);
caseRouter.post("/:id/request", requestCaseController);

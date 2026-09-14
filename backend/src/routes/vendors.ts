import { Router } from "express";
import {
  assignRequirementsController,
  createVendorController,
  getVendorController,
  listVendorsController,
  updateVendorController,
} from "../controllers/vendors.js";
import { createCaseController } from "../controllers/cases.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const vendorRouter = Router();
vendorRouter.use(requireAuth, requireOrganization);
vendorRouter.get("/", listVendorsController);
vendorRouter.post("/", createVendorController);
vendorRouter.get("/:id", getVendorController);
vendorRouter.patch("/:id", updateVendorController);
vendorRouter.put("/:id/requirements", assignRequirementsController);
vendorRouter.post("/:id/cases", createCaseController);

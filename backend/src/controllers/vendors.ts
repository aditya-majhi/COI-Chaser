import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  assignRequirementsSchema,
  createVendorSchema,
  updateVendorSchema,
  uuidSchema,
} from "../validators/domain.js";
import { validationError } from "../utils/http.js";
import {
  assignVendorRequirements,
  createOrganizationVendor,
  getOrganizationVendor,
  listOrganizationVendors,
  updateOrganizationVendor,
} from "../services/vendor-service.js";

function organizationId(request: Request) {
  return request.organizationId as string;
}

export async function listVendorsController(
  request: Request,
  response: Response
) {
  response.json(await listOrganizationVendors(organizationId(request)));
}

export async function createVendorController(
  request: Request,
  response: Response
) {
  try {
    const input = createVendorSchema.parse(request.body);
    const vendor = await createOrganizationVendor(
      organizationId(request),
      { name: input.name, legal_name: input.legal_name },
      input.contacts
    );
    response.status(201).json(vendor);
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}

export async function getVendorController(
  request: Request,
  response: Response
) {
  const vendorId = uuidSchema.parse(request.params.id);
  const vendor = await getOrganizationVendor(organizationId(request), vendorId);
  if (!vendor) {
    response.status(404).json({ error: "Vendor not found" });
    return;
  }
  response.json(vendor);
}

export async function updateVendorController(
  request: Request,
  response: Response
) {
  try {
    const vendorId = uuidSchema.parse(request.params.id);
    const input = updateVendorSchema.parse(request.body);
    const vendor = await updateOrganizationVendor(
      organizationId(request),
      vendorId,
      input
    );
    if (!vendor) {
      response.status(404).json({ error: "Vendor not found" });
      return;
    }
    response.json(vendor);
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}

export async function assignRequirementsController(
  request: Request,
  response: Response
) {
  try {
    const vendorId = uuidSchema.parse(request.params.id);
    const input = assignRequirementsSchema.parse(request.body);
    const requirements = await assignVendorRequirements(
      organizationId(request),
      vendorId,
      input.template_id,
      input.requirements
    );
    if (!requirements) {
      response.status(404).json({ error: "Vendor not found" });
      return;
    }
    response.json(requirements);
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}

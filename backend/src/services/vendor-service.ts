import {
  assignRequirements,
  createVendor,
  getRequirementTemplate,
  getVendor,
  listVendors,
  updateVendor,
} from "../repositories/vendors.js";

export async function listOrganizationVendors(organizationId: string) {
  return listVendors(organizationId);
}

export async function getOrganizationVendor(
  organizationId: string,
  vendorId: string
) {
  return getVendor(organizationId, vendorId);
}

export async function createOrganizationVendor(
  organizationId: string,
  input: Parameters<typeof createVendor>[1],
  contacts: Parameters<typeof createVendor>[2]
) {
  return createVendor(organizationId, input, contacts);
}

export async function updateOrganizationVendor(
  organizationId: string,
  vendorId: string,
  updates: Parameters<typeof updateVendor>[2]
) {
  return updateVendor(organizationId, vendorId, updates);
}

export async function assignVendorRequirements(
  organizationId: string,
  vendorId: string,
  templateId: string | undefined,
  requirements: Record<string, unknown>
) {
  if (templateId && !(await getRequirementTemplate(templateId))) {
    const error = new Error("Requirement template not found");
    error.name = "NotFoundError";
    throw error;
  }
  return assignRequirements(organizationId, vendorId, templateId, requirements);
}

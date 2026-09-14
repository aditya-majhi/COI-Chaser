import { apiRequest } from "./client";

export type VendorContactInput = {
  name: string;
  email: string;
  role?: string;
  is_primary?: boolean;
};

export type CreateVendorInput = {
  name: string;
  legal_name?: string;
  contacts?: VendorContactInput[];
};

export type RequirementInput = {
  template_id?: string;
  requirements: Record<string, unknown>;
};

export function listVendors(organizationId: string) {
  return apiRequest<unknown[]>("/vendors", undefined, organizationId);
}

export function createVendor(organizationId: string, input: CreateVendorInput) {
  return apiRequest<unknown>(
    "/vendors",
    { method: "POST", body: JSON.stringify(input) },
    organizationId
  );
}

export function getVendor(organizationId: string, vendorId: string) {
  return apiRequest<unknown>(`/vendors/${vendorId}`, undefined, organizationId);
}

export function updateVendor(
  organizationId: string,
  vendorId: string,
  input: Partial<Pick<CreateVendorInput, "name" | "legal_name">>
) {
  return apiRequest<unknown>(
    `/vendors/${vendorId}`,
    { method: "PATCH", body: JSON.stringify(input) },
    organizationId
  );
}

export function assignRequirements(
  organizationId: string,
  vendorId: string,
  input: RequirementInput
) {
  return apiRequest<unknown>(
    `/vendors/${vendorId}/requirements`,
    { method: "PUT", body: JSON.stringify(input) },
    organizationId
  );
}

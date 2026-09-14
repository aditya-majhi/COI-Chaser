import { apiRequest } from "./client";

export type CreateOrganizationInput = { name: string; slug: string };

export function createOrganization(input: CreateOrganizationInput) {
  return apiRequest<{ id: string; name: string; slug: string }>(
    "/organizations",
    { method: "POST", body: JSON.stringify(input) }
  );
}

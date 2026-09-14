import { createOrganizationWithOwner } from "../repositories/organizations.js";

export async function registerOrganization(
  name: string,
  slug: string,
  userId: string
) {
  return createOrganizationWithOwner(name, slug, userId);
}

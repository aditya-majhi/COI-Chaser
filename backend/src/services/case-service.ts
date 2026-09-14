import {
  createCase,
  getCase,
  listCaseEvents,
  transitionCase,
} from "../repositories/cases.js";
import { getVendor } from "../repositories/vendors.js";
import { assertTransition } from "./case-state.js";
import type { CaseStatus } from "../types/domain.js";

export async function createOrganizationCase(
  organizationId: string,
  vendorId: string,
  type: "INITIAL" | "RENEWAL",
  workStartDate: string
) {
  const vendor = await getVendor(organizationId, vendorId);
  if (!vendor) return null;
  const assignedRequirements = vendor.vendor_requirements;
  if (
    !assignedRequirements ||
    (Array.isArray(assignedRequirements) && assignedRequirements.length === 0)
  ) {
    const error = new Error(
      "Vendor requirements must be assigned before creating a case"
    );
    error.name = "RequirementsNotAssignedError";
    throw error;
  }
  return createCase(organizationId, vendorId, type, workStartDate);
}

export async function getOrganizationCase(
  organizationId: string,
  caseId: string
) {
  return getCase(organizationId, caseId);
}

export async function transitionOrganizationCase(
  organizationId: string,
  caseId: string,
  nextStatus: CaseStatus,
  userId: string,
  metadata: Record<string, unknown>
) {
  const existingCase = await getCase(organizationId, caseId);
  if (!existingCase) return null;

  assertTransition(existingCase.status as CaseStatus, nextStatus);
  return transitionCase(
    organizationId,
    caseId,
    nextStatus,
    "USER",
    userId,
    metadata
  );
}

export async function getOrganizationCaseEvents(
  organizationId: string,
  caseId: string
) {
  return listCaseEvents(organizationId, caseId);
}

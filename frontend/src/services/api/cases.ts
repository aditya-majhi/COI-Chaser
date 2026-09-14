import { apiRequest } from "./client";

export type CreateCaseInput = {
  type?: "INITIAL" | "RENEWAL";
  work_start_date: string;
};

export function createCase(
  organizationId: string,
  vendorId: string,
  input: CreateCaseInput
) {
  return apiRequest<unknown>(
    `/vendors/${vendorId}/cases`,
    { method: "POST", body: JSON.stringify(input) },
    organizationId
  );
}

export function getCase(organizationId: string, caseId: string) {
  return apiRequest<unknown>(`/cases/${caseId}`, undefined, organizationId);
}

export function transitionCase(
  organizationId: string,
  caseId: string,
  status: string,
  metadata: Record<string, unknown> = {}
) {
  return apiRequest<unknown>(
    `/cases/${caseId}/transition`,
    { method: "POST", body: JSON.stringify({ status, metadata }) },
    organizationId
  );
}

export function listCaseEvents(organizationId: string, caseId: string) {
  return apiRequest<unknown[]>(
    `/cases/${caseId}/events`,
    undefined,
    organizationId
  );
}

export function requestCase(organizationId: string, caseId: string) {
  return apiRequest<unknown>(
    `/cases/${caseId}/request`,
    { method: "POST" },
    organizationId
  );
}

export function decideHumanReview(
  organizationId: string,
  caseId: string,
  decision: "REQUEST_MORE_EVIDENCE" | "REJECT" | "APPROVE_EXCEPTION",
  note?: string
) {
  return apiRequest<unknown>(
    `/cases/${caseId}/human-review`,
    { method: "POST", body: JSON.stringify({ decision, note }) },
    organizationId
  );
}

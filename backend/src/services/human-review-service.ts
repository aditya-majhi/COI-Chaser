import {
  createCaseEvent,
  getCase,
  transitionCase,
} from "../repositories/cases.js";
import type { CaseStatus } from "../types/domain.js";

export type HumanDecision =
  | "REQUEST_MORE_EVIDENCE"
  | "REJECT"
  | "APPROVE_EXCEPTION";

export async function applyHumanDecision(
  organizationId: string,
  caseId: string,
  userId: string,
  decision: HumanDecision,
  note?: string
) {
  const caseRecord = await getCase(organizationId, caseId);
  if (!caseRecord) return null;
  if (caseRecord.status !== "HUMAN_REVIEW") {
    const error = new Error("Case is not awaiting human review");
    error.name = "InvalidHumanReviewStateError";
    throw error;
  }
  const next: CaseStatus =
    decision === "REJECT"
      ? "BLOCKED"
      : decision === "APPROVE_EXCEPTION"
        ? "CLEARED"
        : "WAITING_FOR_CORRECTION";
  const metadata = {
    decision,
    note: note ?? null,
    human_override: decision === "APPROVE_EXCEPTION",
  };
  const updated = await transitionCase(
    organizationId,
    caseId,
    next,
    "USER",
    userId,
    metadata
  );
  await createCaseEvent(
    caseId,
    `HUMAN_REVIEW_${decision}`,
    "USER",
    metadata,
    userId
  );
  return updated;
}

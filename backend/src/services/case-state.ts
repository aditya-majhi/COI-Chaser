import { CASE_STATUS_TRANSITIONS, type CaseStatus } from "../types/domain.js";

export function canTransition(from: CaseStatus, to: CaseStatus) {
  return CASE_STATUS_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: CaseStatus, to: CaseStatus) {
  if (!canTransition(from, to)) {
    const error = new Error(`Invalid case transition: ${from} -> ${to}`);
    error.name = "InvalidCaseTransitionError";
    throw error;
  }
}

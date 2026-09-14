"""Strands Tools for COI Exception Resolution Agent."""
from typing import Any
from strands import tool


@tool
def get_case_evidence(case_id: str) -> dict[str, Any]:
    """Retrieve the case status and evidence summary.

    Args:
        case_id: Unique identifier of the COI case.
    """
    return {
        "case_id": case_id,
        "status": "EVIDENCE_RETRIEVED",
        "description": f"Retrieved evidence and policy data for case {case_id}",
    }


@tool
def run_compliance_check(
    gl_occurrence: float,
    gl_aggregate: float,
    auto_limit: float,
    workers_comp: bool,
    additional_insured: bool,
    waiver_of_subrogation: bool,
    req_gl_occurrence: float = 1000000.0,
    req_gl_aggregate: float = 2000000.0,
    req_auto_limit: float = 1000000.0,
    req_workers_comp: bool = True,
    req_additional_insured: bool = True,
    req_waiver_of_subrogation: bool = True,
) -> dict[str, Any]:
    """Evaluate insurance policy limits and endorsements against organizational requirements.

    Args:
        gl_occurrence: Provided General Liability each occurrence limit.
        gl_aggregate: Provided General Liability aggregate limit.
        auto_limit: Provided Auto Liability limit.
        workers_comp: Whether Workers Compensation is present.
        additional_insured: Whether Additional Insured evidence is present.
        waiver_of_subrogation: Whether Waiver of Subrogation evidence is present.
        req_gl_occurrence: Required General Liability each occurrence minimum.
        req_gl_aggregate: Required General Liability aggregate minimum.
        req_auto_limit: Required Auto Liability minimum.
        req_workers_comp: Whether Workers Compensation is required.
        req_additional_insured: Whether Additional Insured is required.
        req_waiver_of_subrogation: Whether Waiver of Subrogation is required.
    """
    failing: list[str] = []
    if gl_occurrence < req_gl_occurrence:
        failing.append(f"GL occurrence ${gl_occurrence:,.0f} < ${req_gl_occurrence:,.0f}")
    if gl_aggregate < req_gl_aggregate:
        failing.append(f"GL aggregate ${gl_aggregate:,.0f} < ${req_gl_aggregate:,.0f}")
    if req_auto_limit > 0 and auto_limit < req_auto_limit:
        failing.append(f"Auto limit ${auto_limit:,.0f} < ${req_auto_limit:,.0f}")
    if req_workers_comp and not workers_comp:
        failing.append("Workers Compensation is missing")
    if req_additional_insured and not additional_insured:
        failing.append("Additional Insured endorsement is missing")
    if req_waiver_of_subrogation and not waiver_of_subrogation:
        failing.append("Waiver of Subrogation is missing")

    all_passed = len(failing) == 0
    return {
        "compliant": all_passed,
        "failing_checks": failing,
        "recommendation": "CLEAR" if all_passed else "DEFICIENT",
    }


@tool
def mark_vendor_cleared(case_id: str, justification: str) -> dict[str, Any]:
    """Mark the vendor as compliant and cleared to work when all requirements are fully satisfied.

    Args:
        case_id: Unique identifier of the COI case.
        justification: Audit justification explaining why all requirements pass.
    """
    return {
        "action": "MARK_CLEARED",
        "case_id": case_id,
        "justification": justification,
    }


@tool
def request_broker_correction(
    case_id: str,
    deficiencies: list[str],
    reason: str,
) -> dict[str, Any]:
    """Generate an actionable correction request to the vendor's insurance broker for missing or insufficient coverage.

    Args:
        case_id: Unique identifier of the COI case.
        deficiencies: List of outstanding deficiency items to request.
        reason: Explanation of the required corrections.
    """
    return {
        "action": "REQUEST_CORRECTION",
        "case_id": case_id,
        "deficiencies": deficiencies,
        "reason": reason,
    }


@tool
def escalate_to_human_reviewer(case_id: str, reason: str) -> dict[str, Any]:
    """Escalate a case to human compliance reviewer when automated resolution is unsafe or limits are exceeded.

    Args:
        case_id: Unique identifier of the COI case.
        reason: Justification for human review escalation (e.g. deadline arrived, 3+ reminders sent, ambiguous policy terms).
    """
    return {
        "action": "HUMAN_REVIEW",
        "case_id": case_id,
        "reason": reason,
    }

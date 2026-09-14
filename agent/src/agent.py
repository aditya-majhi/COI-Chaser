"""Autonomous Strands Exception Agent for Vendor COI Compliance."""
from os import getenv
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from strands import Agent

from .gemini_model import GeminiStrandsModel
from .tools import (
    escalate_to_human_reviewer,
    get_case_evidence,
    mark_vendor_cleared,
    request_broker_correction,
    run_compliance_check,
)

app = FastAPI(title="COI Exception Agent (Strands + Gemini)")

STRANDS_SYSTEM_PROMPT = """
You are an autonomous COI Compliance Exception Agent in an insurance compliance platform.
Your objective: Investigate vendor insurance compliance exceptions using tools and decide the next operational action.

Tool Calling & Decision Rules:
1. Use `get_case_evidence` to inspect case evidence.
2. If evidence limits are provided, test them with `run_compliance_check`.
3. If all compliance checks pass, call `mark_vendor_cleared`.
4. If followup_count >= 3 or days_until_work_start <= 0, call `escalate_to_human_reviewer`.
5. If mandatory insurance evidence is deficient, call `request_broker_correction`.
6. You must NEVER waive mandatory insurance requirements or approve an invalid vendor.

Return a final JSON decision or invoke the appropriate operational tool:
{"action": "REQUEST_CORRECTION" | "HUMAN_REVIEW" | "MARK_CLEARED" | "NO_ACTION", "reason": "concise explanation"}
"""


class CaseInput(BaseModel):
    case_id: str
    status: str
    vendor_name: str
    deficiencies: list[str]
    days_until_work_start: int | None = None
    followup_count: int = 0


def create_strands_agent(api_key: str, model_id: str) -> Agent:
    """Create a Strands Agent wired to Gemini with autonomous tools."""
    model = GeminiStrandsModel(api_key=api_key, model_id=model_id)
    return Agent(
        model=model,
        tools=[
            get_case_evidence,
            run_compliance_check,
            mark_vendor_cleared,
            request_broker_correction,
            escalate_to_human_reviewer,
        ],
        system_prompt=STRANDS_SYSTEM_PROMPT,
    )


def decide(case: CaseInput) -> dict[str, Any]:
    api_key = getenv("GEMINI_API_KEY")
    model_id = getenv("GEMINI_MODEL_ID", "gemini-2.5-flash-lite")

    if api_key:
        try:
            agent = create_strands_agent(api_key, model_id)
            prompt = (
                f"Evaluate this case exception:\n"
                f"Case ID: {case.case_id}\n"
                f"Vendor: {case.vendor_name}\n"
                f"Current Status: {case.status}\n"
                f"Deficiencies: {', '.join(case.deficiencies)}\n"
                f"Days until work start: {case.days_until_work_start}\n"
                f"Followup reminders sent so far: {case.followup_count}\n"
            )
            result = agent(prompt)
            return _parse_agent_result(result, str(result))
        except Exception as err:
            print(f"[strands-agent] Execution error, falling back to deterministic rules: {err}")
            return fallback_decide(case)

    return fallback_decide(case)


def fallback_decide(case: CaseInput) -> dict[str, Any]:
    if case.status not in {"NON_COMPLIANT", "WAITING_FOR_CORRECTION"}:
        return {"action": "NO_ACTION", "reason": "Case does not need exception handling."}
    if not case.deficiencies:
        return {"action": "HUMAN_REVIEW", "reason": "No actionable deficiency was supplied."}
    if case.followup_count >= 3 or (case.days_until_work_start is not None and case.days_until_work_start <= 0):
        return {"action": "HUMAN_REVIEW", "reason": "Automated follow-up limit or deadline reached."}
    return {"action": "REQUEST_CORRECTION", "reason": "Mandatory evidence is deficient; corrected evidence is required."}


def _parse_agent_result(agent_result: Any, text: str) -> dict[str, Any]:
    import json
    # 1. First try parsing direct text output
    cleaned = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        value = json.loads(cleaned)
        if isinstance(value, dict) and "action" in value:
            return {"action": value["action"], "reason": str(value.get("reason", ""))}
    except Exception:
        pass

    # 2. Check message content for tool outputs or structured fields
    if hasattr(agent_result, "message") and isinstance(agent_result.message, dict):
        for item in agent_result.message.get("content", []):
            if isinstance(item, dict) and "text" in item:
                try:
                    c_text = item["text"].strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                    val = json.loads(c_text)
                    if isinstance(val, dict) and "action" in val:
                        return {"action": val["action"], "reason": str(val.get("reason", ""))}
                except Exception:
                    continue

    # 3. Default safe action
    return {"action": "REQUEST_CORRECTION", "reason": "Deficiencies identified in submitted evidence"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": "coi-exception-agent", "framework": "strands-agents", "status": "ok"}


@app.post("/decide")
def decision(case: CaseInput, x_agent_secret: str | None = Header(default=None)) -> dict[str, Any]:
    if getenv("AGENT_SHARED_SECRET") and x_agent_secret != getenv("AGENT_SHARED_SECRET"):
        raise HTTPException(status_code=401, detail="Invalid agent credential")
    return decide(case)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(getenv("AGENT_PORT", "8000")))

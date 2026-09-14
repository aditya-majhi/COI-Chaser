import axios from "axios";
import { env } from "../config/env.js";
import {
  claimAgentAction,
  finishAgentAction,
} from "../repositories/agent-actions.js";
import {
  createCaseEvent,
  getCase,
  transitionCase,
} from "../repositories/cases.js";
import { sendCorrectionRequest } from "./email.js";

export async function resolveCase(
  organizationId: string,
  caseId: string,
  deficiencies: string[]
) {
  const caseRecord = await getCase(organizationId, caseId);
  if (!caseRecord) return null;
  const action = await claimAgentAction(caseId, "EXCEPTION_RESOLUTION", {
    deficiencies,
  });
  if (!action) return { duplicate: true };
  const days = Math.ceil(
    (new Date(caseRecord.work_start_date).getTime() - Date.now()) / 86400000
  );
  const { data: decision } = await axios.post<{
    action: string;
    reason: string;
  }>(
    `${env.AGENT_SERVICE_URL}/decide`,
    {
      case_id: caseId,
      status: caseRecord.status,
      vendor_name: caseRecord.vendors.name,
      deficiencies,
      days_until_work_start: days,
      followup_count: caseRecord.followup_count,
    },
    {
      headers: { "X-Agent-Secret": env.INTERNAL_API_SECRET ?? "" },
      timeout: 30_000,
    }
  );
  if (decision.action === "REQUEST_CORRECTION") {
    const contact =
      caseRecord.vendors.vendor_contacts?.find(
        (item: { is_primary: boolean }) => item.is_primary
      ) ?? caseRecord.vendors.vendor_contacts?.[0];
    if (!contact)
      throw new Error("Vendor needs a contact for correction requests");
    const messageId = await sendCorrectionRequest({
      caseId,
      inboundAddress: caseRecord.inbound_address,
      recipient: contact.email,
      vendorName: caseRecord.vendors.name,
      deficiencies,
    });
    await transitionCase(
      organizationId,
      caseId,
      "WAITING_FOR_CORRECTION",
      "AGENT",
      undefined,
      { deficiencies }
    );
    await createCaseEvent(caseId, "CORRECTION_REQUEST_SENT", "AGENT", {
      deficiencies,
      message_id: messageId,
    });
  } else if (decision.action === "HUMAN_REVIEW") {
    await transitionCase(
      organizationId,
      caseId,
      "HUMAN_REVIEW",
      "AGENT",
      undefined,
      { reason: decision.reason, deficiencies }
    );
    await createCaseEvent(caseId, "HUMAN_REVIEW_REQUIRED", "AGENT", {
      reason: decision.reason,
    });
  } else if (
    decision.action === "MARK_CLEARED" ||
    decision.action === "CLEARED"
  ) {
    await transitionCase(
      organizationId,
      caseId,
      "COMPLIANT",
      "AGENT",
      undefined,
      { justification: decision.reason }
    );
    await transitionCase(
      organizationId,
      caseId,
      "CLEARED",
      "AGENT",
      undefined,
      { justification: decision.reason }
    );
    await createCaseEvent(caseId, "VENDOR_CLEARED", "AGENT", {
      justification: decision.reason,
    });
  }
  await finishAgentAction(action.id, decision);
  return decision;
}

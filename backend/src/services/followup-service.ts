import { createCaseEvent, transitionCase } from "../repositories/cases.js";
import {
  getLatestDeficiencies,
  listDueCases,
  scheduleNextAction,
} from "../repositories/followups.js";
import { sendCorrectionRequest, sendCaseRequest } from "./email.js";
import { resolveCase } from "./agent-service.js";

const delay = (count: number) =>
  new Date(Date.now() + (count >= 3 ? 1 : 3) * 86400000).toISOString();

export async function processDueCases() {
  const results: unknown[] = [];
  for (const item of await listDueCases()) {
    const count = item.followup_count + 1;
    const contact =
      item.vendors.vendor_contacts?.find(
        (value: { is_primary: boolean }) => value.is_primary
      ) ?? item.vendors.vendor_contacts?.[0];
    if (!contact) continue;
    if (item.status === "WAITING_FOR_CORRECTION") {
      const deficiencies = await getLatestDeficiencies(item.id);
      results.push(
        await resolveCase(
          item.organization_id,
          item.id,
          deficiencies.length ? deficiencies : ["SUPPORTING_EVIDENCE_REQUIRED"]
        )
      );
    } else if (count <= 3) {
      const messageId = await sendCaseRequest({
        caseId: item.id,
        inboundAddress: item.inbound_address,
        recipient: contact.email,
        vendorName: item.vendors.name,
        workStartDate: item.work_start_date,
        requirements:
          "Follow-up: please provide the requested certificate of insurance.",
      });
      await scheduleNextAction(item.id, count, delay(count));
      await createCaseEvent(item.id, "REMINDER_SENT", "SYSTEM", {
        followup_count: count,
        message_id: messageId,
      });
      results.push({
        case_id: item.id,
        action: "REMINDER_SENT",
        followup_count: count,
      });
    } else {
      await transitionCase(
        item.organization_id,
        item.id,
        "HUMAN_REVIEW",
        "SYSTEM",
        undefined,
        { reason: "No response after three automated follow-ups" }
      );
      await createCaseEvent(item.id, "HUMAN_REVIEW_REQUIRED", "SYSTEM", {
        reason: "No response after three automated follow-ups",
      });
      results.push({ case_id: item.id, action: "HUMAN_REVIEW" });
    }
  }
  return results;
}

import { createCaseEvent, getCase } from "../repositories/cases.js";
import { markRequestSent } from "../repositories/requests.js";
import { sendCaseRequest } from "./email.js";

export async function requestCase(organizationId: string, caseId: string) {
  const caseRecord = await getCase(organizationId, caseId);
  if (!caseRecord) return null;
  if (caseRecord.status !== "DRAFT" && caseRecord.status !== "REQUEST_READY") {
    const error = new Error(
      `Cannot request a certificate from case status ${caseRecord.status}`
    );
    error.name = "InvalidCaseRequestError";
    throw error;
  }
  const contact =
    caseRecord.vendors?.vendor_contacts?.find(
      (item: { is_primary: boolean }) => item.is_primary
    ) ?? caseRecord.vendors?.vendor_contacts?.[0];
  if (!contact) {
    const error = new Error(
      "Vendor needs an email contact before a request can be sent"
    );
    error.name = "VendorContactRequiredError";
    throw error;
  }
  const nextActionAt = new Date(Date.now() + 3 * 86400000).toISOString();
  const email = await sendCaseRequest({
    caseId,
    inboundAddress: caseRecord.inbound_address,
    recipient: contact.email,
    vendorName: caseRecord.vendors.name,
    workStartDate: caseRecord.work_start_date,
    requirements:
      caseRecord.vendors?.vendor_requirements?.[0]?.requirements ?? {},
  });
  const updated = await markRequestSent(caseId, nextActionAt);
  await createCaseEvent(caseId, "COI_REQUEST_SENT", "SYSTEM", {
    recipient: contact.email,
    message_id: email.messageId,
  });
  return updated;
}

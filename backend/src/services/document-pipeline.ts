import {
  createCaseEvent,
  getCase,
  transitionCase,
} from "../repositories/cases.js";
import {
  getDocumentForCase,
  saveExtraction,
} from "../repositories/extraction.js";
import { saveComplianceResult } from "../repositories/compliance.js";
import { resolveCase } from "./agent-service.js";
import { extractInsuranceDocument } from "./gemini.js";
import { evaluateCompliance } from "./compliance.js";
import { canTransition } from "./case-state.js";
import { supabaseAdmin } from "./supabase.js";
import type { CaseStatus } from "../types/domain.js";
import type {
  ExtractedInsurance,
  InsuranceRequirements,
} from "../types/insurance.js";

// A hedgy UNKNOWN classification shouldn't override genuinely extracted evidence.
function hasAnyExtractedValue(extracted: ExtractedInsurance) {
  return [
    extracted.general_liability?.each_occurrence?.value,
    extracted.general_liability?.aggregate?.value,
    extracted.workers_comp?.present?.value,
    extracted.auto_liability?.limit?.value,
    extracted.additional_insured?.value,
    extracted.waiver_of_subrogation?.value,
  ].some(value => value !== null && value !== undefined);
}

// Only advance if the case is still in the expected state and the move is a valid transition.
async function advanceIfCurrent(
  organizationId: string,
  caseId: string,
  from: CaseStatus,
  to: CaseStatus,
  metadata: Record<string, unknown> = {}
) {
  const current = await getCase(organizationId, caseId);
  if (!current || current.status !== from || !canTransition(from, to))
    return current;
  return transitionCase(
    organizationId,
    caseId,
    to,
    "SYSTEM",
    undefined,
    metadata
  );
}

export async function processUploadedDocument(
  organizationId: string,
  caseId: string,
  documentId: string
) {
  const document = await getDocumentForCase(organizationId, caseId, documentId);
  if (!document) return null;

  await advanceIfCurrent(organizationId, caseId, "DRAFT", "DOCUMENT_RECEIVED", {
    document_id: documentId,
  });
  await advanceIfCurrent(
    organizationId,
    caseId,
    "REQUEST_READY",
    "DOCUMENT_RECEIVED",
    { document_id: documentId }
  );
  await advanceIfCurrent(
    organizationId,
    caseId,
    "WAITING_FOR_DOCUMENT",
    "DOCUMENT_RECEIVED",
    { document_id: documentId }
  );
  await advanceIfCurrent(
    organizationId,
    caseId,
    "WAITING_FOR_CORRECTION",
    "DOCUMENT_RECEIVED",
    { document_id: documentId }
  );

  let extracted: ExtractedInsurance;
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("coi-documents")
      .download(document.storage_path);
    if (error) throw error;
    extracted = await extractInsuranceDocument(
      new Uint8Array(await data.arrayBuffer())
    );
    const documentType = extracted.document_type ?? "UNKNOWN";
    console.log(
      "[pipeline] document_id:",
      documentId,
      "document_type:",
      documentType,
      "hasAnyExtractedValue:",
      hasAnyExtractedValue(extracted)
    );
    await saveExtraction(documentId, extracted, documentType);
    await createCaseEvent(caseId, "DOCUMENT_CLASSIFIED", "SYSTEM", {
      document_id: documentId,
      document_type: documentType,
      extracted,
    });
    if (documentType === "UNRELATED") {
      return { status: "UNRELATED_DOCUMENT" as const };
    }
    // A hedgy UNKNOWN label from the model shouldn't block a case that actually has real extracted values.
    if (documentType === "UNKNOWN" && !hasAnyExtractedValue(extracted)) {
      await advanceIfCurrent(
        organizationId,
        caseId,
        "DOCUMENT_RECEIVED",
        "HUMAN_REVIEW",
        {
          reason: "Document type could not be determined from its contents",
          document_id: documentId,
        }
      );
      return { status: "UNKNOWN_DOCUMENT" as const };
    }
  } catch (error) {
    await createCaseEvent(caseId, "DOCUMENT_EXTRACTED", "SYSTEM", {
      document_id: documentId,
      failed: true,
      message:
        error instanceof Error ? error.message : "Unknown extraction error",
    });
    await advanceIfCurrent(
      organizationId,
      caseId,
      "DOCUMENT_RECEIVED",
      "HUMAN_REVIEW",
      {
        reason: "Document extraction failed or is unavailable",
      }
    );
    return { status: "EXTRACTION_FAILED" as const };
  }
  await createCaseEvent(caseId, "DOCUMENT_EXTRACTED", "SYSTEM", {
    document_id: documentId,
  });

  await advanceIfCurrent(
    organizationId,
    caseId,
    "DOCUMENT_RECEIVED",
    "PROCESSING"
  );

  const caseRecord = await getCase(organizationId, caseId);
  if (!caseRecord) return null;
  const requirements = (caseRecord.vendors?.vendor_requirements?.[0]
    ?.requirements ?? {}) as InsuranceRequirements;

  await createCaseEvent(caseId, "COMPLIANCE_CHECK_STARTED", "SYSTEM", {
    document_id: documentId,
  });
  const result = evaluateCompliance(
    requirements,
    extracted,
    caseRecord.work_start_date
  );
  await saveComplianceResult(caseId, result, documentId);
  await createCaseEvent(
    caseId,
    result.compliant ? "COMPLIANCE_CHECK_PASSED" : "COMPLIANCE_CHECK_FAILED",
    "SYSTEM",
    { deficiencies: result.deficiencies }
  );

  if (result.compliant) {
    await advanceIfCurrent(organizationId, caseId, "PROCESSING", "COMPLIANT");
    await advanceIfCurrent(organizationId, caseId, "COMPLIANT", "CLEARED");
    await createCaseEvent(caseId, "VENDOR_CLEARED", "SYSTEM", {});
    return { status: "CLEARED" as const };
  }

  await advanceIfCurrent(
    organizationId,
    caseId,
    "PROCESSING",
    "NON_COMPLIANT",
    {
      deficiencies: result.deficiencies,
    }
  );
  const decision = await resolveCase(
    organizationId,
    caseId,
    result.deficiencies
  );
  return { status: "NON_COMPLIANT" as const, decision };
}

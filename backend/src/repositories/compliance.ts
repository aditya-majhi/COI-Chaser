import { supabaseAdmin } from "../services/supabase.js";
import type { ComplianceResult } from "../types/insurance.js";

export async function saveComplianceResult(
  caseId: string,
  result: ComplianceResult,
  documentId?: string
) {
  const rows = result.checks.map(check => ({
    case_id: caseId,
    document_id: documentId ?? null,
    rule_code: check.rule,
    status: check.status,
    required_value: check.required ?? null,
    provided_value: check.provided ?? null,
    details: { deficiencies: result.deficiencies },
  }));
  const { error } = await supabaseAdmin.from("compliance_checks").insert(rows);
  if (error) throw error;
  return result;
}

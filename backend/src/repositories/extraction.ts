import { supabaseAdmin } from "../services/supabase.js";

export async function getDocumentForCase(
  organizationId: string,
  caseId: string,
  documentId: string
) {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("*, coi_cases!inner(organization_id)")
    .eq("id", documentId)
    .eq("case_id", caseId)
    .eq("coi_cases.organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveExtraction(
  documentId: string,
  data: unknown,
  documentType:
    | "CERTIFICATE_OF_INSURANCE"
    | "ENDORSEMENT"
    | "UNKNOWN"
    | "UNRELATED"
) {
  const { data: extraction, error } = await supabaseAdmin
    .from("extracted_policy_data")
    .insert({ document_id: documentId, data, confidence: {} })
    .select()
    .single();
  if (error) throw error;
  await supabaseAdmin
    .from("documents")
    .update({ status: "PROCESSED", document_type: documentType })
    .eq("id", documentId);
  return extraction;
}

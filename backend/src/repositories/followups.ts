import { supabaseAdmin } from "../services/supabase.js";

export async function listDueCases(now = new Date().toISOString()) {
  const { data, error } = await supabaseAdmin
    .from("coi_cases")
    .select("*, vendors(*, vendor_contacts(*))")
    .lte("next_action_at", now)
    .in("status", ["WAITING_FOR_DOCUMENT", "WAITING_FOR_CORRECTION"]);
  if (error) throw error;
  return data ?? [];
}

export async function getLatestDeficiencies(caseId: string) {
  const { data, error } = await supabaseAdmin
    .from("compliance_checks")
    .select("rule_code, status")
    .eq("case_id", caseId)
    .in("status", ["FAIL", "REVIEW"]);
  if (error) throw error;
  return (data ?? []).map(item => item.rule_code);
}

export async function scheduleNextAction(
  caseId: string,
  followupCount: number,
  nextActionAt: string
) {
  const { data, error } = await supabaseAdmin
    .from("coi_cases")
    .update({ followup_count: followupCount, next_action_at: nextActionAt })
    .eq("id", caseId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

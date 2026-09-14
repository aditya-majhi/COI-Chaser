import { supabaseAdmin } from "../services/supabase.js";

export async function claimAgentAction(
  caseId: string,
  actionType: string,
  input: Record<string, unknown>
) {
  const idempotencyKey = `${caseId}:${actionType}:${JSON.stringify(input)}`;
  const { data, error } = await supabaseAdmin
    .from("agent_actions")
    .insert({
      case_id: caseId,
      action_type: actionType,
      idempotency_key: idempotencyKey,
      input,
    })
    .select()
    .maybeSingle();
  if (error?.code === "23505") return null;
  if (error) throw error;
  return data;
}

export async function finishAgentAction(
  id: string,
  output: Record<string, unknown>
) {
  const { error } = await supabaseAdmin
    .from("agent_actions")
    .update({ output })
    .eq("id", id);
  if (error) throw error;
}

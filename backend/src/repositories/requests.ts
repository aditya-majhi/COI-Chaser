import { supabaseAdmin } from "../services/supabase.js";

export async function markRequestSent(caseId: string, nextActionAt: string) {
  const { data, error } = await supabaseAdmin
    .from("coi_cases")
    .update({
      status: "WAITING_FOR_DOCUMENT",
      request_sent_at: new Date().toISOString(),
      next_action_at: nextActionAt,
    })
    .eq("id", caseId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function recordInboundMessage(
  caseId: string,
  sender: string,
  subject: string,
  body: string,
  providerMessageId: string
) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({
      case_id: caseId,
      direction: "INBOUND",
      channel: "EMAIL",
      sender,
      subject,
      body,
      provider_message_id: providerMessageId,
    })
    .select()
    .single();
  if (error && error.code === "23505") return null;
  if (error) throw error;
  return data;
}

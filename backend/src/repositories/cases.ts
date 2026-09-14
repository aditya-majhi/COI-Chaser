import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../services/supabase.js";
import { env } from "../config/env.js";
import type { CaseStatus, CaseType, EventActor } from "../types/domain.js";

export async function createCase(
  organizationId: string,
  vendorId: string,
  type: CaseType,
  workStartDate: string
) {
  const id = randomUUID();
  const { data, error } = await supabaseAdmin
    .from("coi_cases")
    .insert({
      id,
      organization_id: organizationId,
      vendor_id: vendorId,
      type,
      work_start_date: workStartDate,
      inbound_address: `case_${id}@${env.INBOUND_EMAIL_DOMAIN}`,
    })
    .select()
    .single();
  if (error) throw error;

  await createCaseEvent(id, "CASE_CREATED", "USER", { vendor_id: vendorId });
  return data;
}

export async function getCase(organizationId: string, caseId: string) {
  const { data, error } = await supabaseAdmin
    .from("coi_cases")
    .select("*, vendors(*, vendor_contacts(*), vendor_requirements(*))")
    .eq("organization_id", organizationId)
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function caseBelongsToOrganization(
  organizationId: string,
  caseId: string
) {
  const { data, error } = await supabaseAdmin
    .from("coi_cases")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getCaseByInboundAddress(inboundAddress: string) {
  const { data, error } = await supabaseAdmin
    .from("coi_cases")
    .select("id, organization_id")
    .eq("inbound_address", inboundAddress)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function transitionCase(
  organizationId: string,
  caseId: string,
  status: CaseStatus,
  actor: EventActor,
  actorUserId: string | undefined,
  metadata: Record<string, unknown>
) {
  const { data, error } = await supabaseAdmin
    .from("coi_cases")
    .update({ status })
    .eq("organization_id", organizationId)
    .eq("id", caseId)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  await createCaseEvent(
    caseId,
    `CASE_STATUS_${status}`,
    actor,
    metadata,
    actorUserId
  );
  return data;
}

export async function createCaseEvent(
  caseId: string,
  eventType: string,
  actor: EventActor,
  metadata: Record<string, unknown> = {},
  actorUserId?: string
) {
  const { data, error } = await supabaseAdmin
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: eventType,
      actor,
      actor_user_id: actorUserId ?? null,
      metadata,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCaseEvents(organizationId: string, caseId: string) {
  const existingCase = await getCase(organizationId, caseId);
  if (!existingCase) return null;

  const { data, error } = await supabaseAdmin
    .from("case_events")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

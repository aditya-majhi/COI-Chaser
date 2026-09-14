import { supabaseAdmin } from "../services/supabase.js";

export async function listVendors(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("vendors")
    .select(
      "*, vendor_contacts(*), vendor_requirements(*), coi_cases(id, status, work_start_date, updated_at)"
    )
    .eq("organization_id", organizationId)
    .order("name")
    .order("updated_at", {
      foreignTable: "coi_cases",
      ascending: false,
    });

  if (error) throw error;
  return data;
}

export async function getVendor(organizationId: string, vendorId: string) {
  const { data, error } = await supabaseAdmin
    .from("vendors")
    .select("*, vendor_contacts(*), vendor_requirements(*)")
    .eq("organization_id", organizationId)
    .eq("id", vendorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createVendor(
  organizationId: string,
  vendor: { name: string; legal_name?: string },
  contacts: Array<{
    name: string;
    email: string;
    role?: string;
    is_primary: boolean;
  }>,
  requirements: Record<string, unknown>
) {
  const { data: vendorId, error } = await supabaseAdmin.rpc(
    "create_vendor_with_requirements",
    {
      target_organization_id: organizationId,
      target_name: vendor.name,
      target_legal_name: vendor.legal_name ?? null,
      target_contacts: contacts,
      target_requirements: requirements,
    }
  );
  if (error) throw error;
  return getVendor(organizationId, vendorId);
}

export async function updateVendor(
  organizationId: string,
  vendorId: string,
  updates: { name?: string; legal_name?: string }
) {
  const { data, error } = await supabaseAdmin
    .from("vendors")
    .update(updates)
    .eq("organization_id", organizationId)
    .eq("id", vendorId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRequirementTemplate(templateId: string) {
  const { data, error } = await supabaseAdmin
    .from("requirement_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function assignRequirements(
  organizationId: string,
  vendorId: string,
  templateId: string | undefined,
  requirements: Record<string, unknown>
) {
  const vendor = await getVendor(organizationId, vendorId);
  if (!vendor) return null;

  const { data, error } = await supabaseAdmin
    .from("vendor_requirements")
    .upsert(
      {
        vendor_id: vendorId,
        template_id: templateId ?? null,
        requirements,
      },
      { onConflict: "vendor_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

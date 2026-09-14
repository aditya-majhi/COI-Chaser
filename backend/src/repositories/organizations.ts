import { supabaseAdmin } from "../services/supabase.js";

export async function createOrganizationWithOwner(
  name: string,
  slug: string,
  userId: string
) {
  const { data: organization, error } = await supabaseAdmin
    .from("organizations")
    .insert({ name, slug })
    .select()
    .single();
  if (error) throw error;

  const { error: memberError } = await supabaseAdmin
    .from("organization_members")
    .insert({
      organization_id: organization.id,
      user_id: userId,
      role: "OWNER",
    });
  if (memberError) {
    await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", organization.id);
    throw memberError;
  }

  return organization;
}

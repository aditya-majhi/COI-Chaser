create or replace function public.create_vendor_with_requirements(
  target_organization_id uuid,
  target_name text,
  target_legal_name text,
  target_contacts jsonb,
  target_requirements jsonb,
  target_template_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_vendor_id uuid;
  contact jsonb;
begin
  insert into public.vendors (organization_id, name, legal_name)
  values (target_organization_id, target_name, target_legal_name)
  returning id into new_vendor_id;

  for contact in select * from jsonb_array_elements(coalesce(target_contacts, '[]'::jsonb)) loop
    insert into public.vendor_contacts (vendor_id, name, email, role, is_primary)
    values (
      new_vendor_id,
      contact->>'name',
      contact->>'email',
      contact->>'role',
      coalesce((contact->>'is_primary')::boolean, false)
    );
  end loop;

  insert into public.vendor_requirements (vendor_id, template_id, requirements)
  values (new_vendor_id, target_template_id, target_requirements);

  return new_vendor_id;
end;
$$;

revoke all on function public.create_vendor_with_requirements(uuid, text, text, jsonb, jsonb, uuid) from public;
grant execute on function public.create_vendor_with_requirements(uuid, text, text, jsonb, jsonb, uuid) to service_role;

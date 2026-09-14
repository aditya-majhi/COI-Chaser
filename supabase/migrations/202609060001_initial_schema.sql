create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('coi-documents', 'coi-documents', false)
on conflict (id) do nothing;

create type public.case_type as enum ('INITIAL', 'RENEWAL');
create type public.case_status as enum (
  'DRAFT',
  'REQUEST_READY',
  'WAITING_FOR_DOCUMENT',
  'DOCUMENT_RECEIVED',
  'PROCESSING',
  'NON_COMPLIANT',
  'WAITING_FOR_CORRECTION',
  'UNDER_REVIEW',
  'COMPLIANT',
  'CLEARED',
  'BLOCKED',
  'HUMAN_REVIEW',
  'CLOSED'
);
create type public.document_type as enum (
  'CERTIFICATE_OF_INSURANCE',
  'ENDORSEMENT',
  'UNKNOWN',
  'UNRELATED'
);
create type public.document_status as enum (
  'RECEIVED',
  'CLASSIFIED',
  'PROCESSING',
  'PROCESSED',
  'FAILED'
);
create type public.compliance_status as enum ('PASS', 'FAIL', 'REVIEW', 'NOT_APPLICABLE');
create type public.message_direction as enum ('INBOUND', 'OUTBOUND');
create type public.message_channel as enum ('EMAIL', 'DASHBOARD');
create type public.event_actor as enum ('SYSTEM', 'USER', 'AGENT', 'BROKER', 'VENDOR');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('OWNER', 'ADMIN', 'MEMBER', 'REVIEWER')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, user_id)
);

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated;

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  legal_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, name)
);

create table public.vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  email text not null,
  role text,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.requirement_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null default 1 check (version > 0),
  requirements jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (name, version)
);

create table public.vendor_requirements (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  template_id uuid references public.requirement_templates(id) on delete set null,
  requirements jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (vendor_id)
);

create table public.coi_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  type public.case_type not null default 'INITIAL',
  status public.case_status not null default 'DRAFT',
  work_start_date date not null,
  request_sent_at timestamptz,
  next_action_at timestamptz,
  followup_count integer not null default 0 check (followup_count between 0 and 3),
  inbound_address text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (next_action_at is null or request_sent_at is not null)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.coi_cases(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  sha256 text,
  document_type public.document_type not null default 'UNKNOWN',
  status public.document_status not null default 'RECEIVED',
  source text not null default 'MANUAL_UPLOAD' check (source in ('MANUAL_UPLOAD', 'INBOUND_EMAIL')),
  received_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (case_id, sha256)
);

create table public.extracted_policy_data (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  extraction_version integer not null default 1 check (extraction_version > 0),
  data jsonb not null,
  confidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_id, extraction_version)
);

create table public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.coi_cases(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  rule_code text not null,
  status public.compliance_status not null,
  required_value jsonb,
  provided_value jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.coi_cases(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  policy_type text not null check (policy_type in ('GENERAL_LIABILITY', 'WORKERS_COMPENSATION', 'AUTO_LIABILITY')),
  policy_number text,
  effective_date date,
  expiration_date date,
  policy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.coi_cases(id) on delete cascade,
  direction public.message_direction not null,
  channel public.message_channel not null,
  sender text,
  recipient text,
  subject text,
  body text not null,
  provider_message_id text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (channel, provider_message_id)
);

create table public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.coi_cases(id) on delete cascade,
  action_type text not null,
  idempotency_key text not null unique,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.coi_cases(id) on delete cascade,
  event_type text not null,
  actor public.event_actor not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();
create trigger vendors_updated_at
before update on public.vendors
for each row execute function public.set_updated_at();
create trigger vendor_contacts_updated_at
before update on public.vendor_contacts
for each row execute function public.set_updated_at();
create trigger requirement_templates_updated_at
before update on public.requirement_templates
for each row execute function public.set_updated_at();
create trigger vendor_requirements_updated_at
before update on public.vendor_requirements
for each row execute function public.set_updated_at();
create trigger coi_cases_updated_at
before update on public.coi_cases
for each row execute function public.set_updated_at();
create trigger documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();
create trigger insurance_policies_updated_at
before update on public.insurance_policies
for each row execute function public.set_updated_at();

create index organization_members_user_id_idx on public.organization_members(user_id);
create index vendors_organization_id_idx on public.vendors(organization_id);
create index vendor_contacts_vendor_id_idx on public.vendor_contacts(vendor_id);
create index coi_cases_organization_status_idx on public.coi_cases(organization_id, status);
create index coi_cases_next_action_idx on public.coi_cases(next_action_at) where next_action_at is not null;
create index documents_case_id_idx on public.documents(case_id);
create index compliance_checks_case_id_idx on public.compliance_checks(case_id);
create index case_events_case_id_created_at_idx on public.case_events(case_id, created_at);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_contacts enable row level security;
alter table public.requirement_templates enable row level security;
alter table public.vendor_requirements enable row level security;
alter table public.coi_cases enable row level security;
alter table public.documents enable row level security;
alter table public.extracted_policy_data enable row level security;
alter table public.compliance_checks enable row level security;
alter table public.insurance_policies enable row level security;
alter table public.messages enable row level security;
alter table public.agent_actions enable row level security;
alter table public.case_events enable row level security;

create policy "members can read organizations"
on public.organizations for select to authenticated
using (public.is_organization_member(id));

create policy "members can read memberships"
on public.organization_members for select to authenticated
using (public.is_organization_member(organization_id));

create policy "members can read vendors"
on public.vendors for select to authenticated
using (public.is_organization_member(organization_id));

create policy "members can read vendor contacts"
on public.vendor_contacts for select to authenticated
using (exists (
  select 1 from public.vendors
  where vendors.id = vendor_contacts.vendor_id
    and public.is_organization_member(vendors.organization_id)
));

create policy "authenticated users can read requirement templates"
on public.requirement_templates for select to authenticated
using (true);

create policy "members can read vendor requirements"
on public.vendor_requirements for select to authenticated
using (exists (
  select 1 from public.vendors
  where vendors.id = vendor_requirements.vendor_id
    and public.is_organization_member(vendors.organization_id)
));

create policy "members can read cases"
on public.coi_cases for select to authenticated
using (public.is_organization_member(organization_id));

create policy "members can read case documents"
on public.documents for select to authenticated
using (exists (
  select 1 from public.coi_cases
  where coi_cases.id = documents.case_id
    and public.is_organization_member(coi_cases.organization_id)
));

create policy "members can read COI files"
on storage.objects for select to authenticated
using (
  bucket_id = 'coi-documents'
  and public.is_organization_member((storage.foldername(name))[1]::uuid)
);

create policy "members can read extracted data"
on public.extracted_policy_data for select to authenticated
using (exists (
  select 1 from public.documents
  join public.coi_cases on coi_cases.id = documents.case_id
  where documents.id = extracted_policy_data.document_id
    and public.is_organization_member(coi_cases.organization_id)
));

create policy "members can read compliance checks"
on public.compliance_checks for select to authenticated
using (exists (
  select 1 from public.coi_cases
  where coi_cases.id = compliance_checks.case_id
    and public.is_organization_member(coi_cases.organization_id)
));

create policy "members can read policies"
on public.insurance_policies for select to authenticated
using (exists (
  select 1 from public.coi_cases
  where coi_cases.id = insurance_policies.case_id
    and public.is_organization_member(coi_cases.organization_id)
));

create policy "members can read messages"
on public.messages for select to authenticated
using (exists (
  select 1 from public.coi_cases
  where coi_cases.id = messages.case_id
    and public.is_organization_member(coi_cases.organization_id)
));

create policy "members can read agent actions"
on public.agent_actions for select to authenticated
using (exists (
  select 1 from public.coi_cases
  where coi_cases.id = agent_actions.case_id
    and public.is_organization_member(coi_cases.organization_id)
));

create policy "members can read case events"
on public.case_events for select to authenticated
using (exists (
  select 1 from public.coi_cases
  where coi_cases.id = case_events.case_id
    and public.is_organization_member(coi_cases.organization_id)
));

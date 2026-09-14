# Supabase Phase 2

The initial migration establishes the Phase 2 domain schema for organizations, members, vendors, requirements, COI cases, documents, extraction results, compliance checks, messages, agent actions, case events, and insurance policies.

## Apply locally

With the Supabase CLI installed and a local project running:

```powershell
supabase db reset
```

The reset applies migrations and then seed files. To apply only the migration to a linked project:

```powershell
supabase db push
```

The seed creates only the authoritative MVP requirement template. It does not create users, organizations, vendors, or demo cases; those require authenticated application workflows and are introduced in later phases.

## Authentication model

- Supabase Auth owns user identity and JWT issuance.
- `organization_members` connects `auth.users` to application organizations.
- RLS reads are restricted to authenticated members of the relevant organization.
- The Express service uses the service-role client for trusted server-side writes and still verifies caller JWTs on protected routes.
- The service-role key must never be sent to the frontend.

The `public.is_organization_member` function is `security definer` and has a fixed `search_path` to avoid RLS recursion and search-path injection concerns.

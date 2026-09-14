insert into public.requirement_templates (name, version, requirements)
values (
  'MVP Standard Vendor Insurance',
  1,
  '{
    "general_liability": {
      "required": true,
      "occurrence_min": 1000000,
      "aggregate_min": 2000000
    },
    "workers_comp": {
      "required": true
    },
    "auto_liability": {
      "required": true,
      "minimum": 1000000
    },
    "additional_insured": true,
    "waiver_of_subrogation": true
  }'::jsonb
)
on conflict (name, version) do update
set requirements = excluded.requirements,
    updated_at = timezone('utc', now());

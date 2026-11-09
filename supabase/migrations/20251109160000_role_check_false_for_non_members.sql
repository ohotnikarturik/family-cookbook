-- A missing membership made private.has_family_role return null.
-- `if not null` in PL/pgSQL does not enter the branch, so a non-member
-- could pass set_family_member_status. RLS already treats null as deny.
-- Callers now receive false.

create or replace function private.has_family_role (
  p_family_id uuid,
  p_roles public.family_role[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    coalesce(
      private.family_role (p_family_id) = any (p_roles),
      false
    );
$$;

comment on function private.has_family_role (uuid, public.family_role[]) is
  'True only when the caller has an active matching role. Non-members get false, not null.';

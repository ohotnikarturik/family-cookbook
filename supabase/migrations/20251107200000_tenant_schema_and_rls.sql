-- Tenant schema, RLS helpers (private), policies, and pgTAP auth shim (PROJECT_SPEC §6–7; T1.2).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.family_role as enum (
  'owner',
  'admin',
  'editor',
  'contributor',
  'viewer'
);

create type public.membership_status as enum ('active', 'suspended');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  default_language text not null default 'en',
  created_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint families_name_len_ck check (
    char_length(name) >= 1
    and char_length(name) <= 120
  ),
  constraint families_default_language_ck check (default_language in ('en', 'fi', 'ru', 'uk'))
);

comment on table public.families is 'Family tenant boundary; one workspace per row.';

create table public.family_members (
  id uuid primary key default gen_random_uuid (),
  family_id uuid not null references public.families (id) on delete restrict,
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  role public.family_role not null,
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_members_family_user_uniq unique (family_id, user_id)
);

comment on table public.family_members is 'User membership and role within a family.';

create unique index family_members_one_active_owner_uidx on public.family_members (family_id)
where
  role = 'owner'
  and status = 'active';

create index family_members_user_id_status_idx on public.family_members (user_id, status);

create index family_members_family_id_role_status_idx on public.family_members (family_id, role, status);

create table public.family_invitations (
  id uuid primary key default gen_random_uuid (),
  family_id uuid not null references public.families (id) on delete restrict,
  email_normalized text not null,
  role public.family_role not null,
  token_hash text not null,
  invited_by uuid not null references public.profiles (user_id),
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  accepted_by uuid null references public.profiles (user_id),
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint family_invitations_role_not_owner_ck check (role <> 'owner'),
  constraint family_invitations_token_hash_uniq unique (token_hash),
  constraint family_invitations_email_len_ck check (
    char_length(email_normalized) >= 3
    and char_length(email_normalized) <= 320
  )
);

comment on table public.family_invitations is 'Pending invites; only token_hash is stored (PROJECT_SPEC §7.1).';

create index family_invitations_family_id_idx on public.family_invitations (family_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at ()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger families_set_updated_at
before update on public.families
for each row
execute function public.set_updated_at ();

create trigger family_members_set_updated_at
before update on public.family_members
for each row
execute function public.set_updated_at ();

-- ---------------------------------------------------------------------------
-- private: RLS predicate helpers (non-API schema; SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------

create schema private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create or replace function private.current_user_id ()
returns uuid
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select auth.uid ();
$$;

create or replace function private.is_active_member (p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select
      1
    from
      public.family_members fm
    where
      fm.family_id = p_family_id
      and fm.user_id = auth.uid ()
      and fm.status = 'active'
  );
$$;

create or replace function private.family_role (p_family_id uuid)
returns public.family_role
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    fm.role
  from
    public.family_members fm
  where
    fm.family_id = p_family_id
    and fm.user_id = auth.uid ()
    and fm.status = 'active'
  limit
    1;
$$;

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
    private.family_role (p_family_id) = any (p_roles);
$$;

create or replace function private.can_manage_memberships (p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    private.has_family_role (p_family_id, array['owner', 'admin']::public.family_role[]);
$$;

create or replace function private.is_family_creator (p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select
      1
    from
      public.families f
    where
      f.id = p_family_id
      and f.created_by = auth.uid ()
      and f.deleted_at is null
  );
$$;

create or replace function private.family_has_members (p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select
      1
    from
      public.family_members fm
    where
      fm.family_id = p_family_id
  );
$$;

create or replace function private.membership_role_allowed_for_inviter (
  p_family_id uuid,
  p_target_role public.family_role
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    case
      when p_target_role = 'owner' then false
      when p_target_role = 'admin' then private.family_role (p_family_id) = 'owner'
      when private.family_role (p_family_id) = 'admin' then p_target_role not in ('admin', 'owner')
      when private.family_role (p_family_id) = 'owner' then p_target_role not in ('owner')
      else false
    end;
$$;

revoke all on function private.current_user_id () from public;
revoke all on function private.is_active_member (uuid) from public;
revoke all on function private.family_role (uuid) from public;
revoke all on function private.has_family_role (uuid, public.family_role[]) from public;
revoke all on function private.can_manage_memberships (uuid) from public;
revoke all on function private.is_family_creator (uuid) from public;
revoke all on function private.family_has_members (uuid) from public;
revoke all on function private.membership_role_allowed_for_inviter (uuid, public.family_role) from public;

grant execute on function private.current_user_id () to authenticated;
grant execute on function private.is_active_member (uuid) to authenticated;
grant execute on function private.family_role (uuid) to authenticated;
grant execute on function private.has_family_role (uuid, public.family_role[]) to authenticated;
grant execute on function private.can_manage_memberships (uuid) to authenticated;
grant execute on function private.is_family_creator (uuid) to authenticated;
grant execute on function private.family_has_members (uuid) to authenticated;
grant execute on function private.membership_role_allowed_for_inviter (uuid, public.family_role) to authenticated;

-- ---------------------------------------------------------------------------
-- tests: pgTAP JWT shim (superuser-only)
-- ---------------------------------------------------------------------------

create schema tests;

revoke all on schema tests from public;
revoke all on schema tests from anon, authenticated;

create or replace function tests.request_as_user (p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'tests.request_as_user is for local pgTAP only';
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',
      p_user_id::text,
      'role',
      'authenticated',
      'aal',
      'aal1'
    )::text,
    true
  );
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
end;
$$;

revoke all on function tests.request_as_user (uuid) from public;
revoke all on function tests.request_as_user (uuid) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security: families
-- ---------------------------------------------------------------------------

alter table public.families enable row level security;

create policy "families_select_active_member"
  on public.families
  for select
  to authenticated
  using (
    deleted_at is null
    and private.is_active_member (id)
  );

create policy "families_insert_creator"
  on public.families
  for insert
  to authenticated
  with check (created_by = auth.uid ());

create policy "families_update_managers"
  on public.families
  for update
  to authenticated
  using (
    deleted_at is null
    and private.can_manage_memberships (id)
  )
  with check (
    deleted_at is null
    and private.can_manage_memberships (id)
    and created_by = (
      select
        f.created_by
      from
        public.families f
      where
        f.id = families.id
    )
  );

-- ---------------------------------------------------------------------------
-- Row level security: family_members
-- ---------------------------------------------------------------------------

alter table public.family_members enable row level security;

create policy "family_members_select_active_member"
  on public.family_members
  for select
  to authenticated
  using (private.is_active_member (family_id));

create policy "family_members_insert"
  on public.family_members
  for insert
  to authenticated
  with check (
    (
      user_id = auth.uid ()
      and role = 'owner'
      and status = 'active'
      and private.is_family_creator (family_id)
      and not private.family_has_members (family_id)
    )
    or (
      private.can_manage_memberships (family_id)
      and role <> 'owner'
      and private.membership_role_allowed_for_inviter (family_id, role)
    )
  );

create policy "family_members_update_managers"
  on public.family_members
  for update
  to authenticated
  using (
    private.can_manage_memberships (family_id)
    and role <> 'owner'
  )
  with check (
    private.can_manage_memberships (family_id)
    and role <> 'owner'
    and private.membership_role_allowed_for_inviter (family_id, role)
  );

-- ---------------------------------------------------------------------------
-- Row level security: family_invitations
-- ---------------------------------------------------------------------------

alter table public.family_invitations enable row level security;

create policy "family_invitations_select_managers"
  on public.family_invitations
  for select
  to authenticated
  using (private.can_manage_memberships (family_id));

create policy "family_invitations_insert_managers"
  on public.family_invitations
  for insert
  to authenticated
  with check (
    role <> 'owner'
    and private.can_manage_memberships (family_id)
    and private.membership_role_allowed_for_inviter (family_id, role)
    and invited_by = auth.uid ()
  );

create policy "family_invitations_update_managers"
  on public.family_invitations
  for update
  to authenticated
  using (private.can_manage_memberships (family_id))
  with check (
    private.can_manage_memberships (family_id)
    and invited_by = (
      select
        i.invited_by
      from
        public.family_invitations i
      where
        i.id = family_invitations.id
    )
  );

-- ---------------------------------------------------------------------------
-- Table privileges (auto_expose_new_tables = false in config.toml)
-- ---------------------------------------------------------------------------

revoke all on table public.families from public, anon, authenticated;
grant
select,
insert,
update on table public.families to authenticated;

revoke all on table public.family_members from public, anon, authenticated;
grant
select,
insert,
update on table public.family_members to authenticated;

revoke all on table public.family_invitations from public, anon, authenticated;
grant
select,
insert,
update on table public.family_invitations to authenticated;

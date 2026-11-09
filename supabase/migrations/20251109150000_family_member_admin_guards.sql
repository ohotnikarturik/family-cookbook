-- W35.5 follow-up: direct membership updates must match the admin RPCs.
-- An admin must not demote another admin, nobody may change their own row,
-- identity columns stay fixed, and a suspended member's role stays put.
-- Role and status changes record an audit event in the same transaction.

create or replace function public.set_family_member_role (
  p_family_id uuid,
  p_member_user_id uuid,
  p_new_role public.family_role
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_target public.family_members%rowtype;
begin
  if not private.can_manage_memberships (p_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_member_user_id = auth.uid () then
    raise exception 'cannot_change_own_membership' using errcode = '22023';
  end if;

  if p_new_role = 'owner' then
    raise exception 'owner_role_forbidden' using errcode = '22023';
  end if;

  if not private.membership_role_allowed_for_inviter (p_family_id, p_new_role) then
    raise exception 'role_not_allowed' using errcode = '22023';
  end if;

  select
    *
  into
    v_target
  from
    public.family_members fm
  where
    fm.family_id = p_family_id
    and fm.user_id = p_member_user_id
  for update;

  if not found then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;

  if v_target.role = 'owner' then
    raise exception 'cannot_modify_owner' using errcode = '22023';
  end if;

  if v_target.role = 'admin' and private.family_role (p_family_id) is distinct from 'owner' then
    raise exception 'admin_manage_owner_only' using errcode = '42501';
  end if;

  if v_target.status <> 'active' then
    raise exception 'member_not_active' using errcode = '22023';
  end if;

  if v_target.role = p_new_role then
    return;
  end if;

  update public.family_members
  set
    role = p_new_role
  where
    family_id = p_family_id
    and user_id = p_member_user_id;

  insert into public.audit_events (
    family_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_family_id,
    auth.uid (),
    'family_member.role_changed',
    'family_member',
    v_target.id,
    jsonb_build_object(
      'user_id',
      p_member_user_id,
      'from_role',
      v_target.role,
      'to_role',
      p_new_role
    )
  );
end;
$$;

create or replace function public.set_family_member_status (
  p_family_id uuid,
  p_member_user_id uuid,
  p_new_status public.membership_status
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_target public.family_members%rowtype;
  v_other_active_owners integer;
begin
  if not private.can_manage_memberships (p_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_member_user_id = auth.uid () then
    raise exception 'cannot_change_own_membership' using errcode = '22023';
  end if;

  select
    *
  into
    v_target
  from
    public.family_members fm
  where
    fm.family_id = p_family_id
    and fm.user_id = p_member_user_id
  for update;

  if not found then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;

  if v_target.role = 'owner' then
    raise exception 'cannot_modify_owner' using errcode = '22023';
  end if;

  if v_target.role = 'admin' and private.family_role (p_family_id) is distinct from 'owner' then
    raise exception 'admin_manage_owner_only' using errcode = '42501';
  end if;

  if v_target.status = p_new_status then
    return;
  end if;

  -- Owner rows are rejected above. This also refuses a change that would
  -- leave the family with no active owner if that guard is ever narrowed.
  if p_new_status = 'suspended'
    and v_target.status = 'active'
    and v_target.role = 'owner' then
    select
      count(*)::integer
    into
      v_other_active_owners
    from
      public.family_members fm
    where
      fm.family_id = p_family_id
      and fm.status = 'active'
      and fm.role = 'owner'
      and fm.user_id <> p_member_user_id;

    if v_other_active_owners < 1 then
      raise exception 'no_active_owner' using errcode = '22023';
    end if;
  end if;

  update public.family_members
  set
    status = p_new_status
  where
    family_id = p_family_id
    and user_id = p_member_user_id;

  insert into public.audit_events (
    family_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_family_id,
    auth.uid (),
    'family_member.status_changed',
    'family_member',
    v_target.id,
    jsonb_build_object(
      'user_id',
      p_member_user_id,
      'from_status',
      v_target.status,
      'to_status',
      p_new_status
    )
  );
end;
$$;

comment on function public.set_family_member_role (uuid, uuid, public.family_role) is
  'Owner/Admin changes a co-member role. Owner rows and owner role assignment use dedicated flows. Writes family_member.role_changed.';

comment on function public.set_family_member_status (uuid, uuid, public.membership_status) is
  'Owner/Admin suspends or reactivates a co-member. Never suspends the sole active owner. Writes family_member.status_changed.';

revoke all on function public.set_family_member_role (uuid, uuid, public.family_role)
from
  public;

revoke all on function public.set_family_member_status (uuid, uuid, public.membership_status)
from
  public;

grant
execute on function public.set_family_member_role (uuid, uuid, public.family_role) to authenticated;

grant
execute on function public.set_family_member_status (uuid, uuid, public.membership_status) to authenticated;

drop policy "family_members_update_managers" on public.family_members;

create policy "family_members_update_managers"
  on public.family_members
  for update
  to authenticated
  using (
    private.can_manage_memberships (family_id)
    and user_id is distinct from auth.uid ()
    and role <> 'owner'
    and (
      role <> 'admin'
      or private.family_role (family_id) = 'owner'
    )
  )
  with check (
    private.can_manage_memberships (family_id)
    and user_id is distinct from auth.uid ()
    and role <> 'owner'
    and private.membership_role_allowed_for_inviter (family_id, role)
    and family_id = (
      select
        fm.family_id
      from
        public.family_members fm
      where
        fm.id = family_members.id
    )
    and user_id = (
      select
        fm.user_id
      from
        public.family_members fm
      where
        fm.id = family_members.id
    )
    and joined_at = (
      select
        fm.joined_at
      from
        public.family_members fm
      where
        fm.id = family_members.id
    )
    and created_at = (
      select
        fm.created_at
      from
        public.family_members fm
      where
        fm.id = family_members.id
    )
    and (
      role = (
        select
          fm.role
        from
          public.family_members fm
        where
          fm.id = family_members.id
      )
      or (
        select
          fm.status
        from
          public.family_members fm
        where
          fm.id = family_members.id
      ) = 'active'
    )
  );

comment on policy "family_members_update_managers" on public.family_members is
  'Managers may change another member''s role or status. Not self, not an owner, and an admin cannot change an admin. Identity columns stay fixed. A suspended member keeps their role.';

-- W35.5: transactional role and suspension changes (owner transfer is W35.6).

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
  v_active_owners integer;
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

  if p_new_status = 'suspended' then
    select
      count(*)::integer
    into
      v_active_owners
    from
      public.family_members fm
    where
      fm.family_id = p_family_id
      and fm.status = 'active'
      and fm.role = 'owner';

    if v_active_owners < 1 then
      raise exception 'no_active_owner' using errcode = '22023';
    end if;
  end if;

  update public.family_members
  set
    status = p_new_status
  where
    family_id = p_family_id
    and user_id = p_member_user_id;
end;
$$;

comment on function public.set_family_member_role (uuid, uuid, public.family_role) is
  'Owner/Admin changes a co-member role. Owner rows and owner role assignment use dedicated flows.';

comment on function public.set_family_member_status (uuid, uuid, public.membership_status) is
  'Owner/Admin suspends or reactivates a co-member. Never suspends the sole active owner.';

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

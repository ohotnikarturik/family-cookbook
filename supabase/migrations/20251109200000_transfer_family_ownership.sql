-- W35.6: atomic family ownership transfer (owner-only).

create or replace function public.transfer_family_ownership (
  p_family_id uuid,
  p_new_owner_user_id uuid,
  p_former_owner_role public.family_role default 'admin'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner public.family_members%rowtype;
  v_target public.family_members%rowtype;
begin
  if private.family_role (p_family_id) is distinct from 'owner' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_new_owner_user_id = auth.uid () then
    raise exception 'cannot_transfer_to_self' using errcode = '22023';
  end if;

  if p_former_owner_role = 'owner' then
    raise exception 'former_owner_role_forbidden' using errcode = '22023';
  end if;

  select
    *
  into
    v_owner
  from
    public.family_members fm
  where
    fm.family_id = p_family_id
    and fm.user_id = auth.uid ()
  for update;

  if not found or v_owner.role <> 'owner' or v_owner.status <> 'active' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select
    *
  into
    v_target
  from
    public.family_members fm
  where
    fm.family_id = p_family_id
    and fm.user_id = p_new_owner_user_id
  for update;

  if not found then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;

  if v_target.status <> 'active' then
    raise exception 'member_not_active' using errcode = '22023';
  end if;

  if v_target.role = 'owner' then
    raise exception 'target_already_owner' using errcode = '22023';
  end if;

  update public.family_members
  set
    role = p_former_owner_role
  where
    id = v_owner.id;

  update public.family_members
  set
    role = 'owner'
  where
    id = v_target.id;

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
    'family_member.ownership_transferred',
    'family_member',
    v_target.id,
    jsonb_build_object(
      'from_user_id',
      auth.uid (),
      'to_user_id',
      p_new_owner_user_id,
      'former_owner_role',
      p_former_owner_role
    )
  );
end;
$$;

comment on function public.transfer_family_ownership (uuid, uuid, public.family_role) is
  'Owner transfers ownership to another active member. Demotes the current owner first, then promotes the target. Writes family_member.ownership_transferred.';

revoke all on function public.transfer_family_ownership (uuid, uuid, public.family_role)
from
  public;

grant
execute on function public.transfer_family_ownership (uuid, uuid, public.family_role) to authenticated;

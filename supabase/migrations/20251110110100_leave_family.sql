-- W38.8: leave a family, tell a suspended or former member why they have no
-- access, and keep managers from touching a member who left.
-- Depends on 20251110110000_membership_status_left.sql (adds the 'left' value).

-- ---------------------------------------------------------------------------
-- leave_family: a member ends their own membership. The row is kept.
-- ---------------------------------------------------------------------------

create or replace function public.leave_family (p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_member public.family_members%rowtype;
begin
  if auth.uid () is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select
    *
  into
    v_member
  from
    public.family_members fm
  where
    fm.family_id = p_family_id
    and fm.user_id = auth.uid ()
  for update;

  if not found or v_member.status <> 'active' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- The unique index allows one active owner, so an active owner is the sole
  -- owner. They must transfer ownership first.
  if v_member.role = 'owner' then
    raise exception 'sole_owner_must_transfer' using errcode = '22023';
  end if;

  update public.family_members
  set
    status = 'left'
  where
    id = v_member.id;

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
    'family_member.left',
    'family_member',
    v_member.id,
    jsonb_build_object('user_id', auth.uid (), 'from_role', v_member.role)
  );
end;
$$;

comment on function public.leave_family (uuid) is
  'An active non-owner member leaves a family. The membership row stays with status left; writes family_member.left (no email).';

revoke all on function public.leave_family (uuid)
from
  public;

grant
execute on function public.leave_family (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_my_family_access: the caller's own non-active state, nothing else.
-- ---------------------------------------------------------------------------

create or replace function public.get_my_family_access (p_family_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    fm.status::text
  from
    public.family_members fm
  where
    fm.family_id = p_family_id
    and fm.user_id = auth.uid ()
    and fm.status <> 'active'
  limit
    1;
$$;

comment on function public.get_my_family_access (uuid) is
  'Returns suspended or left for the caller''s own membership, otherwise null. Reveals nothing about other users or other families.';

revoke all on function public.get_my_family_access (uuid)
from
  public;

grant
execute on function public.get_my_family_access (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- set_family_member_status: managers toggle active <-> suspended only.
-- ---------------------------------------------------------------------------

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

  -- Leaving is the member's own choice (leave_family); a manager cannot set
  -- it for them or undo it.
  if p_new_status = 'left' then
    raise exception 'status_not_allowed' using errcode = '22023';
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

  if v_target.status = 'left' then
    raise exception 'member_left' using errcode = '22023';
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

comment on function public.set_family_member_status (uuid, uuid, public.membership_status) is
  'Owner/Admin suspends or reactivates a co-member (active <-> suspended only). Never suspends the sole active owner; a member who left cannot be changed. Writes family_member.status_changed.';

-- ---------------------------------------------------------------------------
-- Direct updates: the same rule at the table, so the RPC is not the only guard.
-- ---------------------------------------------------------------------------

drop policy "family_members_update_managers" on public.family_members;

create policy "family_members_update_managers"
  on public.family_members
  for update
  to authenticated
  using (
    private.can_manage_memberships (family_id)
    and user_id is distinct from auth.uid ()
    and role <> 'owner'
    and status <> 'left'
    and (
      role <> 'admin'
      or private.family_role (family_id) = 'owner'
    )
  )
  with check (
    private.can_manage_memberships (family_id)
    and user_id is distinct from auth.uid ()
    and role <> 'owner'
    and status in ('active', 'suspended')
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
  'Managers may change another member''s role or toggle active/suspended. Not self, not an owner, and an admin cannot change an admin. Identity columns stay fixed. A suspended member keeps their role. A member who left cannot be updated, and nobody can set left here (leave_family only).';

-- ---------------------------------------------------------------------------
-- accept_family_invitation: a member who left is reactivated, not duplicated.
-- ---------------------------------------------------------------------------

create or replace function public.accept_family_invitation (p_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, extensions
as $$
declare
  v_uid uuid;
  v_email text;
  v_hash text;
  v_invite public.family_invitations%rowtype;
  v_left_id uuid;
begin
  v_uid := auth.uid ();
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_token is null or char_length(btrim(p_token)) < 16 or char_length(p_token) > 256 then
    raise exception 'invalid invitation token' using errcode = '22023';
  end if;

  v_hash := encode(extensions.digest(btrim(p_token), 'sha256'), 'hex');

  select *
  into v_invite
  from public.family_invitations fi
  where fi.token_hash = v_hash
  for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'invitation revoked' using errcode = '23503';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'invitation already accepted' using errcode = '23505';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'invitation expired' using errcode = '22023';
  end if;

  select lower(u.email)
  into v_email
  from auth.users u
  where u.id = v_uid
    and u.email_confirmed_at is not null;

  if v_email is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;

  if v_email <> v_invite.email_normalized then
    raise exception 'email does not match invitation' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.family_members fm
    where fm.family_id = v_invite.family_id
      and fm.user_id = v_uid
      and fm.status = 'active'
  ) then
    raise exception 'already a member' using errcode = '23505';
  end if;

  select fm.id
  into v_left_id
  from public.family_members fm
  where fm.family_id = v_invite.family_id
    and fm.user_id = v_uid
    and fm.status = 'left'
  for update;

  if v_left_id is not null then
    update public.family_members
    set
      status = 'active',
      role = v_invite.role,
      joined_at = now()
    where id = v_left_id;
  else
    insert into public.family_members (family_id, user_id, role, status)
    values (v_invite.family_id, v_uid, v_invite.role, 'active');
  end if;

  perform set_config('family_cookbook.invitation_redeem', '1', true);

  update public.family_invitations
  set
    accepted_at = now(),
    accepted_by = v_uid
  where id = v_invite.id;

  return v_invite.family_id;
end;
$$;

comment on function public.accept_family_invitation (text) is
  'Redeems a single-use invitation after confirmed-email match; creates the membership, or reactivates one that was left, atomically.';

-- ---------------------------------------------------------------------------
-- list_family_member_directory: people who left are not listed.
-- ---------------------------------------------------------------------------

create or replace function public.list_family_member_directory (p_family_id uuid)
returns table (
  user_id uuid,
  role public.family_role,
  status public.membership_status,
  display_name text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not private.is_active_member (p_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    fm.user_id,
    fm.role,
    fm.status,
    nullif(btrim(p.display_name), '') as display_name
  from
    public.family_members fm
    inner join public.profiles p on p.user_id = fm.user_id
  where
    fm.family_id = p_family_id
    and fm.status <> 'left'
  order by
    case fm.role
      when 'owner' then 1
      when 'admin' then 2
      when 'editor' then 3
      when 'contributor' then 4
      when 'viewer' then 5
    end,
    coalesce(nullif(btrim(p.display_name), ''), fm.user_id::text);
end;
$$;

comment on function public.list_family_member_directory (uuid) is
  'Active family members see co-member display names and roles (people who left are not listed). Never exposes auth email.';
